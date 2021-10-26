const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StreamerInfo = new Schema({
  username: String,
  encryptedRefreshToken: String,
  commands: [{
    // Response will either just be a string to return, or a function in lib. Starting with a '#' denotes function
    command: String,
    response: String,
    modOnly: Boolean,
    cooldown: Number,
  }],
});

module.exports = StreamerInfo;