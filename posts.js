var config    = require("./config"),
	sqlite3   = require("sqlite3").verbose(),
	nodefn    = require('when/node'),
	when      = require("when"),
	_         = require("lodash"),
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
	},

	getPostsByUserID: function (user_id) {
		var db = new sqlite3.Database(config.dbfile);
		var deferred = when.defer();

		db.all("SELECT * FROM posts WHERE user_id = ?", user_id, function (err, records) {
				if (err)
					deferred.reject(err);

				if (records.length == 0)
					deferred.reject(new Error('No posts yet.'));

				// remove the user_id attribute from the posts array
				_.each(records, function(item) {
					if(item) {
						console.log(item);
						delete item.user_id;
					}
				})

				deferred.resolve(records);
		});

		db.close();

		return deferred.promise;
	},
}

module.exports = posts;