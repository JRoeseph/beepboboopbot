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
  //TODO: Fix special characters for URL friendly escape characters (N++)
  //TODO: Catch error for category not found
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
  const userInfo = await streamer.getUserLevel(msgInfo.context['user-id']);
  client.say(msgInfo.target, `${userInfo.username}: #${userInfo.rank} - Lv ${userInfo.level} (${userInfo.xp} / ${userInfo.requiredXP} XP)`)
}

const resetDefaultCommands = async (client, msgInfo, streamer) => {
  const streamerInfo = db.getConfig();
  const streamerConfig = await streamerInfo.findOne({username: streamer.username});
  const nonDefaults = streamerConfig.commands.filter((command) => !command.defaultCommand)
  const newCommandList = nonDefaults.concat(constants.defaultCommands);
  streamerConfig.commands = newCommandList;
  await streamerConfig.save();
  streamer.syncCommands(streamerConfig);
  client.say(msgInfo.target, `All default commands have been removed and re-added`);
  console.log('* Executed "!resetDefaultCommands" command');
}

const activeChatters = {};
const grantXp = () => {
  const users = Object.keys(activeChatters);
  users.forEach((user) => {
    const streams = Object.keys(activeChatters[user]);
    // Here we want to change the amount of xp they get depending on the number of streams they're in
    let xp;
    switch(streams.length) {
      case 1:
        xp = Math.floor(Math.random()*2)+4;
        break;
      case 2:
        xp = 2;
        break;
      case 3:
        xp = 1;
        break;
      default:
        xp = 0;
        break;
    }
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
// THEORETICALLY this should never exceed 3600, since Heroku is set to restart our app every hour
let secondsSinceStart = 0;
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

const getLeaderboardURL = (client, msgInfo, streamer) => {
  client.say(msgInfo.target, `@${msgInfo.context['display-name']} -> https://beepboboopbot.herokuapp.com/${streamer.username}/leaderboard`);
}

module.exports = {
  dadJoke,
  ping,
  setTitle,
  setCategory,
  everySecond,
  resetDefaultCommands,
  setActive,
  setStreamers,
  getLevel,
  getLeaderboardURL,
}