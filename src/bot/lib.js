const axios = require('axios');
const db = require('../database');
const constants = require('./constants')

// This is janky, but it avoids a circular dependency
let streamers;
const setStreamers = (streamersParam) => {
  streamers = streamersParam;
}

const removeCommand = (message) => {
  return message.split(' ').splice(1).join(' ');
}

const dadJoke = (client, msgInfo, streamer) => {
  const mindex = msgInfo.msg.indexOf('m');
  const nameFirst = msgInfo.msg.substring(mindex+1);
  const name = nameFirst.endsWith('.') ? nameFirst.substring(0, nameFirst.length - 1) : nameFirst;
  client.say(msgInfo.target, `Hi ${name}, I'm BeepBoBoopBot!`);
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
    await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${streamer.broadcaster_id}`, {title},
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
  const category = removeCommand(msgInfo.msg).replace(/\+/g, '%2B');
  try {
    const categoryResponse = await axios.get(`https://api.twitch.tv/helix/games?name=${category}`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN}`,
        'Client-Id': process.env.CLIENT_ID,
      }
    });
    if (categoryResponse.data.data.length === 0) {
      client.say(msgInfo.target, 'That is an invalid category');
      return;
    }
    const game_id = categoryResponse.data.data[0].id;
    const accessTokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${streamer.refreshToken}&client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}`);
    const accessToken = accessTokenResponse.data.access_token;
    await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${streamer.broadcaster_id}`, {game_id},
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

const getLevel = async (client, msgInfo, streamer) => {
  const name = removeCommand(msgInfo.msg);
  let username;
  if (name !== '') {
    username = name;
  } else {
    username = msgInfo.context['username']
  }
  if (`#${username.toLowerCase()}` === msgInfo.target) {
    client.say(msgInfo.target, `You are the streamer, this might return total xp earned on your channel eventually in the future`);
    return;
  }
  const userInfo = await streamer.getUserLevel(username);
  client.say(msgInfo.target, `${username}: #${userInfo.rank} - Lv ${userInfo.level} (${userInfo.xp} / ${userInfo.requiredXP} XP)`)
}

const updateDefaultCommands = async (client, msgInfo, streamer) => {
  const streamerInfo = db.getConfig();
  const streamerConfig = await streamerInfo.findOne({username: streamer.username});
  constants.defaultCommands.forEach((command) => {
    if (!streamerConfig.commands.find((streamerCommand) => streamerCommand.command === command.command)) {
      streamerConfig.commands.push(command);
    }
  })
  await streamerConfig.save();
  streamer.syncCommands(streamerConfig);
  client.say(msgInfo.target, `All new default commands have been added`);
  console.log('* Executed "!updateDefaultCommands" command');
}

const toggleLevelUpNotifications = async (client, msgInfo, streamer) => {
  streamer.toggleLevelUpNotifications();
  client.say(msgInfo.target, `Level Up Notifications toggled ${streamer.notifyLevelUp ? 'on' : 'off'}`)
}

const toggleCommand = async (client, msgInfo, streamer) => {
  const command = removeCommand(msgInfo.msg);
  const isEnabled = await streamer.toggleCommand(command);
  if (typeof(isEnabled) === 'string') {
    client.say(msgInfo.target, `${command} is not a command for this channel`);
  } else {
    client.say(msgInfo.target, `${command} has been ${isEnabled ? 'enabled' : 'disabled'}`);
  }
}

const addCommand = async (client, msgInfo, streamer) => {
  const noCommand = removeCommand(msgInfo.msg);
  const divide = noCommand.split(' ');
  const newCommand = divide[0]
}

const activeChatters = {};
const grantXp = () => {
  const users = Object.keys(activeChatters);
  users.forEach((user) => {
    const streams = Object.keys(activeChatters[user]);
    const xp = Math.floor(Math.random()*2)+4;
    streams.forEach((stream) => {
      // Here we decrement and remove the user from the activeChatters list if they are zeroed out
      const streamer = streamers.getStreamer(stream);
      activeChatters[user][stream]--;
      if (activeChatters[user][stream] === 0) {
        delete activeChatters[user][stream];
      }
      if (xp > 0) {
        streamer.addXp(user, xp);
      }
    })
    if (Object.keys(activeChatters[user]).length === 0) {
      delete activeChatters[user];
    }
  })
}

const checkIfLive = async (streamers) => {
  try {
    const streamersArray = streamers.getStreamers();
    const streamerQueryParam = streamersArray.reduce((string, streamer) => {
      return string + `user_id=${streamer.broadcaster_id}&` 
    }, '?')
    const streamsInfo = await axios.get(`https://api.twitch.tv/helix/streams${streamerQueryParam.substring(0, streamerQueryParam.length-1)}`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN}`,
        'Client-Id': process.env.CLIENT_ID,
      }
    })
    const liveStreams = []
    streamsInfo.data.data.forEach((streamer)=>liveStreams.push(streamer.user_id));
    streamersArray.forEach((streamer) => streamer.isLive = liveStreams.includes(streamer.broadcaster_id));
  } catch (err) {
    console.error(`ERROR CHECKING IF LIVE: ${err}`)
  }
}

// THEORETICALLY this should never exceed 3600, since Heroku is set to restart our app every hour
// This starts at -1 to make sure on startup it checks for live channels
let secondsSinceStart = -1;
const everySecond = async (streamers) => {
  secondsSinceStart++;
  // This is something only the Heroku app needs to do, and that is ping itself so it doesn't fall asleep
  if (process.env.DEV_MODE === 'false' && secondsSinceStart % 300 === 0) {
    try {
      await axios.get('http://beepboboopbot.herokuapp.com');
    } catch (err) {
      console.log('Refreshed heroku');
    }
  }
  if (secondsSinceStart % 60 === 0) {
    checkIfLive(streamers);
    grantXp();
  }
  streamers.getStreamers().forEach((streamer) => streamer.passTimeOnCommands());
}

const setActive = (user_id, username, channel) => {
  if (username === channel) return;
  const newObj = {};
  newObj[channel] = 10;
  activeChatters[`${user_id}#${username}`] = newObj;
}

const getProfileURL = (client, msgInfo, streamer) => {
  client.say(msgInfo.target, `The XP leaderboard and commands can be found here: https://beepboboopbot.herokuapp.com/${streamer.username}`);
}

module.exports = {
  dadJoke,
  ping,
  setTitle,
  setCategory,
  everySecond,
  updateDefaultCommands,
  setActive,
  setStreamers,
  getLevel,
  getProfileURL,
  toggleLevelUpNotifications,
  toggleCommand,
}