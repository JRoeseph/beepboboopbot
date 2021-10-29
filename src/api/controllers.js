const path = require('path');
const streamers = require('../bot/Streamers');
const leaderboardHTML = require('./leaderboard');

//We are using .htmls btw so we can eventually make it look prettier

const addBot = (req, res, next) => {
  streamers.addStreamer(req.query.code);
  res.status(200).sendFile(path.join(__dirname, '/addBot.html'));
} 

const removeBot = (req, res, next) => {
  streamers.removeStreamer(req.query.code);
  res.status(200).sendFile(path.join(__dirname, '/removeBot.html'));
}

const leaderboard = async (req, res, next) => {
  const streamer = streamers.getStreamer(req.params.streamer);
  const usersModel = streamer.getUsers();
  const users = await usersModel.find().sort({xp: -1}).lean();
  let currRank = 0;
  const userHTML = users.reduce((string, user) => {
    const xpRequired = 16*(user.level+1)*(user.level+1)+100*(user.level+1)-16;
    const prevXpRequired = user.level === 0 ? 0 :16*(user.level)*(user.level)+100*(user.level)-16;
    const percentage = (user.xp-prevXpRequired)*100/(xpRequired-prevXpRequired);
    currRank++;
    return string + `<li>${user.username}: #${currRank} - LV ${user.level} (${user.xp}/${xpRequired} XP)  (${percentage}%)</li>`
  }, '')
  // We call replace twice here since it shows up twice and replaceAll doesn't work in this version of Node
  const streamerBoard = leaderboardHTML.replace('${streamer}', streamer.username).replace('${streamer}', streamer.username);
  const withUsers = streamerBoard.replace('${users}', userHTML);
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(withUsers);
}

module.exports = {
  addBot,
  removeBot,
  leaderboard,
}