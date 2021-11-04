const path = require('path');
const streamers = require('../bot/Streamers');

//We are using .htmls btw so we can eventually make it look prettier

const addBot = (req, res, next) => {
  if (!req.query.code) {
    res.status(200).sendFile(path.join(__dirname, '/html/invalidPage.html'));
  } else {
    streamers.addStreamer(req.query.code);
    res.status(200).sendFile(path.join(__dirname, '/html/addBot.html'));
  }
} 

const removeBot = (req, res, next) => {
  if (!req.query.code) {
    res.status(200).sendFile(path.join(__dirname, '/html/invalidPage.html'));
  } else {
    streamers.removeStreamer(req.query.code);
    res.status(200).sendFile(path.join(__dirname, '/html/removeBot.html'));
  }
}

const profile = async (req, res, next) => {
  const streamer = streamers.getStreamer(req.params.streamer);
  const usersModel = streamer.getUsers();
  const users = await usersModel.find().sort({xp: -1}).lean();
  let currRank = 0;
  users.forEach((user) => {
    const xpRequired = 16*(user.level+1)*(user.level+1)+100*(user.level+1)-16;
    const prevXpRequired = user.level === 0 ? 0 :16*(user.level)*(user.level)+100*(user.level)-16;
    currRank++;
    user.percentage = Math.floor((user.xp-prevXpRequired)*100/(xpRequired-prevXpRequired))+'';
    if (user.percentage.length === 1) {
      user.percentage = '0' + user.percentage;
    }
    user.rank = currRank; 
    switch (currRank) {
      case 1:
        user.color = 'goldRank';
        break;
      case 2:
        user.color = 'silverRank';
        break;
      case 3:
        user.color = 'bronzeRank';
        break;
      default:
        user.color = 'whiteRank';
    }
  })
  const allCommands = streamer.getCommands();
  const commands = [];
  const commandNames = Object.keys(allCommands);
  commandNames.forEach((commandName) => {
    if (allCommands[commandName].showInCommands) {
      commands.push({
        command: commandName,
        description: allCommands[commandName].description ? allCommands[commandName].description : 'No Description Found',
        cooldown: allCommands[commandName].cooldown,
        isEnabled: allCommands[commandName].isEnabled,
        modOnly: allCommands[commandName].modOnly,
        defaultCommand: allCommands[commandName].defaultCommand,
      })
    }
  });
  res.render('profile', {streamer: streamer.username, users, commands});
}

module.exports = {
  addBot,
  removeBot,
  profile,
}