var config    = require("./config"),
	sqlite3   = require("sqlite3").verbose(),
	nodefn    = require('when/node'),
	when      = require("when"),
	sanitizer = require("sanitizer");

posts = 
{
	add: function (post) {
		// store post to the database
		var db = new sqlite3.Database(config.dbfile);
		db.serialize(function() {
			var stmt = db.prepare("INSERT INTO posts (title, body, user_id) VALUES (?, ?, ?)");
			stmt.run(post.title, post.body, post.user_id);
			stmt.finalize();
		});
		db.close();
	},

	sanitizePost: function (post) {
		try {
			post.title = sanitizer.sanitize(post.title)
			post.body = sanitizer.sanitize(post.body)
		} catch (error) {
		    return when.reject(error);
		}
		return when.resolve(post);
	}
}

module.exports = posts;