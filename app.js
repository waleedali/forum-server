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

var auth = express.basicAuth(function(user, pass, callback) {
 	var result = (user === 'testUser' && pass === 'testPass');
 	console.log ("auth attempt: " + user + " " + pass + " " + result);

});


// routes
app.get('/home', auth, function(req, res) {
 res.send('Hello World');
});

app.get('/', function(req, res) {
 res.send('Hello, welcome to the forum server');
});

app.post('/users/signup', function(req, res) {
	
	var user = {
		email: req.body.email,
		pw: req.body.password
	}
	// validate the user input

	// check if the email already exists

	// check for multiple logins in a short period of time

	// create the password hash
	helpers.generateHashedPassword(user.pw)
	.then(function (hash) {
		user.pw = hash;
		console.log ("User data:" + user.pw);
		return user;
	})
	.then (users.saveUser)
	.then (function() {
		console.log (req.body.email + " registered!");
		res.send("ok");
	}, function (error) {
		console.log (error);
	});
});


// Create the database if it doesn't exist
var exists = fs.existsSync(dbfile);
db.serialize(function() {
  if(!exists) {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password TEXT)");
    db.run("CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, post TEXT, date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  }
});
db.close();


app.listen(process.env.PORT || port);
console.log("forum-server started - listening on port " + port);