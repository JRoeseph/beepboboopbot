const path = require('path');

const addBot = (req, res, next) => {
  res.status(200).sendFile(path.join(__dirname, '/addBot.html'));
} 

module.exports = {
  addBot,
}