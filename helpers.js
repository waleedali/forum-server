var bcrypt 		= require('bcryptjs'),
	nodefn 		= require('when/node'),
	when   		= require("when"),
	validator   = require('validator');


helpers = 
{
	generateHashedPassword: function (password) {
	    // Generate a new salt
	    return nodefn.call(bcrypt.genSalt).then(function (salt) {
	        // Hash the provided password with bcrypt
	        return nodefn.call(bcrypt.hash, password, salt);
	    });
	},

	validatePasswordLength: function (password) {
		try {
		    if (!validator.isLength(password, 8)) {
		        throw new Error('Your password must be at least 8 characters long.');
		    }
		} catch (error) {
		    return when.reject(error);
		}
		return when.resolve();
	},

	validateEmail: function (email) {
		try {
		    if (!validator.isEmail(email)) {
		        throw new Error('Please enter a valid email.');
		    }
		} catch (error) {
		    return when.reject(error);
		}
		return when.resolve(email);
	},

	getUserEmailFromRequestHeader: function (req) {
		var header=req.headers['authorization']||'',        // get the header
			token=header.split(/\s+/).pop()||'',            // and the encoded auth token
			auth=new Buffer(token, 'base64').toString(),    // convert from base64
			parts=auth.split(/:/),                          // split on colon
			email=parts[0];									// get the user's email

		return email;
	}

}

module.exports = helpers;