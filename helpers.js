var bcrypt = require('bcryptjs'),
	nodefn = require('when/node');
	when   = require("when");


helpers = 
{
	generateHashedPassword: function (password) {
	    // Generate a new salt
	    return nodefn.call(bcrypt.genSalt).then(function (salt) {
	        // Hash the provided password with bcrypt
	        return nodefn.call(bcrypt.hash, password, salt);
	    });
	}

}

module.exports = helpers;