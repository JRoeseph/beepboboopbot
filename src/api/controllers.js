const path = require('path');
const streamers = require('../bot/Streamers');

//We are using .htmls btw so we can eventually make it look prettier

const addBot = (req, res, next) => {
  streamers.addStreamer(req.query.code);
  res.status(200).sendFile(path.join(__dirname, '/addBot.html'));
} 

const removeBot = (req, res, next) => {
  streamers.removeStreamer(req.query.code);
  res.status(200).sendFile(path.join(__dirname, '/removeBot.html'));
}

module.exports = {
  addBot,
  removeBot,
}