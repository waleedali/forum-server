var config  = require("./config"),
	sqlite3 = require("sqlite3").verbose(),
	nodefn = require('when/node'),
	when    = require("when");

users = 
{
	saveUser: function (user) {
		// store user to the database
		var db = new sqlite3.Database(config.dbfile);
		db.serialize(function() {
			// Bad - Sql injection exploitable 
			// var sql = "INSERT INTO users (email, password) VALUES ('" + user.email + "','" + user.pw + "')";
			// console.log(sql);
			// db.exec(sql, function (err) {
			// 	console.log(err);
			// });

			// Good - SQLite automatically treats the data as input data and it does 
			//        not interfere with parsing the actual SQL statement.
			var stmt = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)");
			stmt.run(user.email, user.pw);
			stmt.finalize();
		});
		db.close();

		return user;
	},

	userExists: function (email) {
		var db = new sqlite3.Database(config.dbfile);
		var deferred = when.defer();

		db.all("SELECT email FROM users WHERE email = ?", email, function (err, records) {
				if (err)
					deferred.reject(err);

				if (records.length > 0)
					deferred.reject(new Error('User already exists.'));	

				deferred.resolve();	
		});
		
		db.close();

		return deferred.promise;
	}

}

module.exports = users;