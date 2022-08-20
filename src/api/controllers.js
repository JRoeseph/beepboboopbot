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

const profilePage = async (req, res, next) => {
  try {
    const streamer = streamers.getStreamer(req.params.streamer);
    const usersModel = await streamer.getUsers();
    const users = await usersModel.find({xpEnabled: {$ne: false}}).sort({xp: -1}).lean();
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
  } catch (err) {
    console.error(`ERROR LOADING PROFILE PAGE: ${err.stack}`);
  }
}

const leaderboardAPI = async (req, res, next) => {
  try {
    const streamer = streamers.getStreamer(req.params.streamer);
    if (!streamer) {
      res.send('Streamer not found');
      return;
    }
    const usersModel = await streamer.getUsers();
    let sortDir;
    if (req.query.dir === 'asc') sortDir = 1;
    else sortDir = -1;
    let sortObj;
    if (req.query.sort === 'username') sortObj = {username: sortDir};
    else sortObj = {xp: sortDir};
    const users = await usersModel.find({xpEnabled: {$ne: false}}, {'_id': 0, '__v': 0})
      .sort(sortObj)
      .skip(req.query.skip)
      .limit(req.query.limit)
      .lean();
    res.send(users);
  } catch (err) {
    console.error(`ERROR LOADING LEADERBOARD API: ${err}`);
  }
}

const streamersAPI = async (req, res, next) => {
  try {
    const streamersList = streamers.getStreamers();
    res.send(streamersList.map((streamer) => streamer.username));
  } catch (err) {
    nsole.error(`ERROR LOADING STREAMERS API: ${err}`);
  }
}

const usercountAPI = async (req, res, next) => {
  try {
    const streamer = streamers.getStreamer(req.params.streamer);
    if (streamer === undefined) {
      res.send("Streamer not found");
    }
    const users = streamer.getUsers();
    const usercount = await users.countDocuments();
    res.send(`${usercount}`);
  } catch (err) {
    console.error(`ERROR LOADING USERCOUNT API: ${err}`);
  }
}

const commandsAPI = async (req, res, next) => {
  try {
    const streamer = streamers.getStreamer(req.params.streamer);
    if (streamer === undefined) {
      res.send("Streamer not found");
    }
    const allCommands = streamer.getCommands();
    res.send(allCommands);
  } catch (err) {
    console.error(`ERROR LOADING COMMANDS API: ${err.stack}`);
  }
}

module.exports = {
  addBot,
  removeBot,
  profilePage,
  leaderboardAPI,
  streamersAPI,
  usercountAPI,
  commandsAPI,
}