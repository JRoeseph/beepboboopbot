const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StreamerInfo = new Schema({
  broadcaster_id: String,
  username: String,
  encryptedRefreshToken: String,
  notifyLevelUp: Boolean,
  commands: [{
    // Response will either just be a string to return, or a function in lib. Starting with a '#' denotes function
    command: String,
    description: String,
    showInCommands: Boolean,
    isEnabled: Boolean,
    response: String,
    modOnly: Boolean,
    cooldown: Number,
    // This is meant to be strictly for the dadJoke, but can be used for custom commands 
    chanceToRun: Number,
    defaultCommand: Boolean,
  }],
});

module.exports = StreamerInfo;