var mongoose = require("mongoose"),
    passportLocalMongoose = require("passport-local-mongoose");

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/citi_open", {useMongoClient: true});

var userSchema = new mongoose.Schema({
  username: String,
  password: String,
  captain: Boolean
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);