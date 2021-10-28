const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserInfo = new Schema({
  user_id: String,
  username: String,
  xp: Number,
  level: Number,
  rewardTokens: Number,
  customStreamerStuff: Object,
});

module.exports = UserInfo;