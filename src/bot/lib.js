const axios = require('axios');
const db = require('../database');

const removeCommand = (message) => {
  return message.split(' ').splice(1).join(' ');
}

const dadJoke = (client, msgInfo, streamer) => {
  const nameFirst = msgInfo.msg.substring(msgInfo.msg.indexOf(' ')+1);
  const name = nameFirst.endsWith('.') ? nameFirst.substring(0, nameFirst.length - 1) : nameFirst;
  client.say(msgInfo.target, `Hi "${name}", I'm BeepBoBoopBot!`);
  console.log(`* ${msgInfo.context.username} just got dad joked`)
}

const ping = (client, msgInfo, streamer) => {
  client.say(msgInfo.target, 'Pong!');
  console.log('* Executed "!ping" command');
}

const setTitle = async (client, msgInfo, streamer) => {
  const title = removeCommand(msgInfo.msg);
  try {
    const accessTokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${streamer.refreshToken}&client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}`);
    const accessToken = accessTokenResponse.data.access_token;
    await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${streamer.broadcasterId}`, {title},
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': process.env.CLIENT_ID,
        'Content-Type': 'application/json',
      }
    })
    client.say(msgInfo.target, `Title has been set to: ${title}`);
    console.log('* Executed "!setTitle" command');
  } catch (err) {
    console.error(`ERROR CHANGING TITLES: ${err}`)
  }
}

const setCategory = async (client, msgInfo, streamer) => {
  const category = removeCommand(msgInfo.msg);
  try {
    const categoryResponse = await axios.get(`https://api.twitch.tv/helix/games?name=${category}`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN}`,
        'Client-Id': process.env.CLIENT_ID,
      }
    });
    const game_id = categoryResponse.data.data[0].id;
    const accessTokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${streamer.refreshToken}&client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}`);
    const accessToken = accessTokenResponse.data.access_token;
    await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${streamer.broadcasterId}`, {game_id},
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': process.env.CLIENT_ID,
        'Content-Type': 'application/json',
      }
    })
    client.say(msgInfo.target, `Category has been set to: ${category}`);
    console.log('* Executed "!setCategory" command');
  } catch (err) {
    console.error(`ERROR CHANGING CATEGORIES: ${err}`)
  }
}

const resetDefaultCommands = async (client, msgInfo, streamer) => {
  const streamerInfo = db.getConfig();
  const streamerConfig = await streamerInfo.findOne({username: streamer.username});
  const nonDefaults = streamerConfig.commands.filter((command) => !command.defaultCommand)
  const newCommandList = nonDefaults.concat([
    {
      command: 'dadjoke',
      response: '#dadJoke',
      modOnly: false,
      cooldown: 300,
      defaultCommand: true,
    },
    {
      command: '!ping',
      response: '#ping',
      modOnly: false,
      cooldown: 60,
      defaultCommand: true,
    },
    {
      command: '!settitle',
      response: '#setTitle',
      modOnly: true,
      cooldown: 0,
      defaultCommand: true,
    },
    {   
      command: '!setcategory',
      response: '#setCategory',
      modOnly: true,
      cooldown: 0,
      defaultCommand: true,
    },
    {
      command: '!addbot',
      response: 'Want to add BeepBoBoopBot to your own channel? Click this link: https://id.twitch.tv/oauth2/authorize?client_id=y5o7q9tom9z1do6hi4466ttwr6vs8s&redirect_uri=https://beepboboopbot.herokuapp.com/addBot&response_type=code&scope=channel:manage:broadcast',
      modOnly: false,
      cooldown: 60,
      defaultCommand: true,
    },
    {
      command: '!removebot',
      response: 'To remove the bot, the broadcaster must click this link: https://id.twitch.tv/oauth2/authorize?client_id=y5o7q9tom9z1do6hi4466ttwr6vs8s&redirect_uri=https://beepboboopbot.herokuapp.com/removeBot&response_type=code',
      modOnly: true,
      cooldown: 60,
      defaultCommand: true,
    },
    {
      command: '!resetdefaultcommands',
      response: '#resetDefaultCommands',
      modOnly: true,
      cooldown: 0,
      defaultCommand: true,
    }
  ]);
  streamerConfig.commands = newCommandList;
  await streamerConfig.save();
  streamer.syncCommands(streamerConfig);
  client.say(msgInfo.target, `All default commands have been removed and re-added`);
  console.log('* Executed "!resetDefaultCommands" command');
}

// THEORETICALLY this should never exceed 3600, since Heroku is set to restart our app every hour
let secondsSinceStart = 0;
const everySecond = async (streamers) => {
  secondsSinceStart++;
  if (process.env.DEV_MODE === 'false' && secondsSinceStart % 300 === 0) {
    try {
      await axios.get('http://beepboboopbot.herokuapp.com');
    } catch (err) {
      console.log('Refreshed heroku');
    }
  }
  streamers.getStreamers().forEach((streamer) => streamer.passTimeOnCommands());
}

module.exports = {
  dadJoke,
  ping,
  setTitle,
  setCategory,
  everySecond,
  resetDefaultCommands,
}