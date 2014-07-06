var express    = require('express');
var fs         = require("fs");
var path = require('path');
var sqlite3    = require("sqlite3").verbose();
var helpers    = require("./helpers");
var config     = require("./config");
var users      = require("./users");
var posts      = require("./posts");
var when       = require("when");
var busboy     = require('connect-busboy');
var sanitizer  = require("sanitizer");
var sanitizefn = require("sanitize-filename");

var app = express();
var port = config.port;
var dbfile = config.dbfile;


// file uploads restrictions
app.use(busboy()); 

// parse the body of the request and then it sets the body property on the request object.
app.use(express.json());
app.use(express.urlencoded());



// Create the database if it doesn't exist
var exists = fs.existsSync(dbfile);
var db = new sqlite3.Database(dbfile);
db.serialize(function() {
	if(!exists) {
		console.log("creating a new db...")
		console.log("creating db tables...")
		db.run("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password TEXT)");
		db.run("CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, body TEXT, date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
	}
});
db.close();

// start the server
app.listen(process.env.PORT || port);
console.log("forum-server started - listening on port " + port);

// routes
app.post('/users/signup', function(req, res) {
	
	var user = {
		email: req.body.email,
		pw: req.body.password
	}

	// sanitize input for any unsafe HTML - XSS protection
	users.sanitizeUser(user)

	// validate the user input
	.then(helpers.validatePasswordLength)
	.then(function () {
		return user.email;
	})
	.then(helpers.validateEmail)

	// check if the email already exists
	.then(users.userExists)
	.then(function () {
		return user.pw;
	})

	// create the password hash
	.then(helpers.generateHashedPassword)
	.then(function (hash) {
		user.pw = hash;
		return user;
	})

	// save to the database
	.then (users.saveUser)
	.then (function() {
		console.log (req.body.email + " registered!");
		res.send(req.body.email + " has been successfully registered.");
	}, function (error) {
		console.log (error);
		res.json(401, {error: error.message});
	});
});

// simple authentication function
var auth = express.basicAuth(function(user, pass, callback) {
	var user = {
		email: user,
		pw: pass
	}

 	users.authenticate(user).then(function (matched) {
 		callback(null, matched);
 	}, function (error) {
 		console.log(error);
 		callback(null, false);
 	});
});

// a user can add posts only if authenticated using the auth function.
app.post('/posts/add', auth, function(req, res) {
 
 	// get the user email from the request header
 	var useremail = helpers.getUserEmailFromRequestHeader(req);

 	var post = {
 		title: req.body.title,
 		body: req.body.body,
 		user_id: 0 // will be set below
 	}

 	// sanitize user input against any unsafe code
 	posts.sanitizePost(post)
 	.then(function () {
 		return useremail;
 	})

 	// get user's id
	.then(users.getUserByEmail)
	.then(function (records) {
		post.user_id = records[0].id;
		return post;
	})

 	// add the post to the database
 	.then(posts.add)

 	.then (function() {
		console.log ("The '" + post.title + "' post has been successfully added.");
		res.send("The '" + post.title + "' post has been successfully added.");
	}, function (error) {
		console.log (error);
		res.json(401, {error: error.message});
	});
	
});

// get all posts for a specific user
app.get('/posts/get', auth, function(req, res) {

	// get the user email from the request header
	var useremail = helpers.getUserEmailFromRequestHeader(req);

	// get user's id
	users.getUserByEmail(useremail)
	.then(function (records) {
		return records[0].id;
	})

	// get user's posts
	.then(posts.getPostsByUserID)

	.then (function(records) {
		res.json(200, records);
	}, function (error) {
		console.log (error);
		res.json(401, {error: error.message});
	});
});



// file upload api
app.post('/files/upload', auth, function(req, res) {
    var fstream;
    var results = [];
    req.busboy.on('file', function (fieldname, file, filename) {
        console.log("Uploading: " + filename); 

        // get the user email from the request header
 		var useremail = helpers.getUserEmailFromRequestHeader(req);

 		users.getUserByEmail(useremail)
		.then(function (records) {
	 		var distinationdir = path.join(__dirname, '/uploads/');

	        // create the uploads directory if it doesn't exist
	        fs.mkdir(distinationdir, function (err) {
	        	if (err && err.code != 'EEXIST') { 
	        		console.log(err);
	        		return;
	        	}

	        	// create the user's directory if it doesn't exist - the directory name will be the user's ID
	        	fs.mkdir(path.join(distinationdir, String(records[0].id)), function (err) {
		        	if (err && err.code != 'EEXIST') { 
		        		console.log(err);
		        		return;
		        	}

		        	// sanitize the filename for any unsafe code
		        	sanitizer.sanitize(filename);
	        	
	        		// Sanitize a string to be safe for use as a file name in 
	        		// Windows and Unix systems by stripping all control characters and restricted characters
	        		sanitizefn(filename);
	        		filename = path.basename(filename);

		        	// for server files safety, the overwrite is not supported
		        	var filepath = path.join(distinationdir, String(records[0].id), filename);
		        	var fileexists = fs.existsSync(filepath)
		        	if (fileexists)
		        	{
		        		file.resume();
		        		console.log("Trying to overwrite existing file. upload will abort.");
		        		results.push("Overwriting existing files is not supported. please use a different file name");
		        		return;
		        	}

					fstream = fs.createWriteStream(filepath);
					file.pipe(fstream);
					fstream.on('close', function () {
					    results.push(filename + " has been successfully uploaded.");
					});

				});

	        });

	    }, function (err) {
			console.log(err);
	    });
    });

    req.pipe(req.busboy);

    req.busboy.on('finish', function() {
      console.log('Done!');
      res.writeHead(200, { Connection: 'close' });
      res.end(JSON.stringify(results));
    });
});

app.get('/files/getmyfiles', auth, function(req, res) {
	
	// get the user email from the request header
	var useremail = helpers.getUserEmailFromRequestHeader(req);

	users.getUserByEmail(useremail)
	.then(function (records) {
		var distinationdir = path.join(__dirname, '/uploads/', String(records[0].id));
	    fs.exists(distinationdir, function (exists) {
	    	if (exists)
	    	{
	    		fs.readdir(distinationdir, function (err, files) {
	    			console.log(files);
	    			if (files.length == 0)
	    				res.json(200, "No files uploaded yet");
	    			else
	    				res.json(200, files);
	    			return;
	    		});
	    	}
	    	else
	    	{
	    		res.json(200, "No files uploaded yet");
	    	}	
	    });
	});
});

app.get('/files/download/:filename', auth, function(req, res) {
	
	var filename = req.params.filename;

	// sanitize the filename for any unsafe code
	sanitizer.sanitize(filename);

	// Sanitize a string to be safe for use as a file name in 
	// Windows and Unix systems by stripping all control characters and restricted characters
	sanitizefn(filename);
	filename = path.basename(filename);

	// get the user email from the request header
	var useremail = helpers.getUserEmailFromRequestHeader(req);

	users.getUserByEmail(useremail)
	.then(function (records) {
		var distinationdir = path.join(__dirname, '/uploads/', String(records[0].id));
	    fs.exists(distinationdir, function (exists) {
	    	if (exists)
	    	{
	    		var filepath = path.join(distinationdir, filename);
	    		res.download(filepath);
	    	}
	    	else
	    	{
	    		res.json(200, "No files uploaded yet");
	    	}	
	    });
	});
});

app.get('/', function(req, res) {
	res.send('Hello, welcome to the forum server.');
});
