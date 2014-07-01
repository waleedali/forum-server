var config  = require("./config"),
	sqlite3 = require("sqlite3").verbose();

users = 
{
	saveUser: function (user) {
		// store user to the database
		var db = new sqlite3.Database(config.dbfile);
		db.serialize(function() {
			var stmt = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)");
			stmt.run(user.email, user.pw);
			console.log("email: " + user.email + " password: " + user.pw);
			stmt.finalize();
		});
		db.close();

		return user;
	}

}

module.exports = users;