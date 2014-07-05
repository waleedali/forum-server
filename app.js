var express = require('express');
var fs      = require("fs");
var sqlite3 = require("sqlite3").verbose();
var helpers = require("./helpers");
var config  = require("./config");
var users   = require("./users");
var when    = require("when");
var nodefn  = require('when/node');


var app = express();
var port = config.port;
var dbfile = config.dbfile;
var db = new sqlite3.Database(dbfile);


// parse the body of the request and then it sets the body property on the request object.
app.use(express.bodyParser());

// Create the database if it doesn't exist
var exists = fs.existsSync(dbfile);
db.serialize(function() {
  if(!exists) {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password TEXT)");
    db.run("CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, post TEXT, date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  }
});
db.close();


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
		res.send("ok");
	}, function (error) {
		console.log (error);
		res.json(401, {error: error.message});
	});
});

// simple authentication function
var auth = express.basicAuth(function(user, pass) {
	var user = {
		email: user,
		pw: pass
	}

 	var result = (user.email === 'waleed.ali@gmail.com' && user.pw === 'pass1234');
 	console.log(user);
 	console.log ("auth attempt result: " + result);
 	return result;
});

app.post('/posts/add', auth, function(req, res) {
 res.send('Hello World');
});

app.get('/', function(req, res) {
 res.send('Hello, welcome to the forum server');
});

app.listen(process.env.PORT || port);
console.log("forum-server started - listening on port " + port);