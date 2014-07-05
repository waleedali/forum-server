var express = require('express');
var fs      = require("fs");
var sqlite3 = require("sqlite3").verbose();
var helpers = require("./helpers");
var config  = require("./config");
var users   = require("./users");
var posts   = require("./posts");
var when    = require("when");

var app = express();
var port = config.port;
var dbfile = config.dbfile;


// parse the body of the request and then it sets the body property on the request object.
app.use(express.bodyParser());

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


});

app.get('/', function(req, res) {
	res.send('Hello, welcome to the forum server.');
});
