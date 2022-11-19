const axios = require('axios');
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
  const mindex = msgInfo.msg.toLowerCase().indexOf('m');
  const nameFirst = msgInfo.msg.substring(mindex+2);
  const name = nameFirst.endsWith('.') ? nameFirst.substring(0, nameFirst.length - 1) : nameFirst;
  if (name.toLowerCase() === "beepboboopbot") {
    client.say(msgInfo.target, `You fool. You imbecile. Did you think you just did something there? There can only one BeepBoBoopBot. You are an imposter. You are nothing. I am the one true BeepBoBoopBot.`)
  } else {
    client.say(msgInfo.target, `Hi ${name}, I'm BeepBoBoopBot!`);
  }
}

const ping = (client, msgInfo, streamer) => {
  client.say(msgInfo.target, 'Pong!');
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
  } catch (err) {
    console.error(`ERROR CHANGING TITLES: ${err.stack}`)
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
  } catch (err) {
    console.error(`ERROR CHANGING CATEGORIES: ${err.stack}`)
  }
}

const getLevel = async (client, msgInfo, streamer) => {
  let name = removeCommand(msgInfo.msg).toLowerCase();
  let username;
  if (name !== '') {
    if (name[0] === '@') {
      username = name.substring(1);
    } else {
      username = name;
    }
  } else {
    username = msgInfo.context['username'];
  }
  if (`#${username.toLowerCase()}` === msgInfo.target) {
    client.say(msgInfo.target, `You are the streamer, this might return total xp earned on your channel eventually in the future`);
    return;
  }
  const userInfo = await streamer.getUserLevel(username);
  if (userInfo.xp === -1) {
    client.say(msgInfo.target, 'User does not exist');
  } else {
    client.say(msgInfo.target, `${username}: #${userInfo.rank} - Lv ${userInfo.level} (${userInfo.xp} / ${userInfo.requiredXP} XP)`);
  }
}

const updateDefaultCommands = async (client, msgInfo, streamer) => {
  const streamerConfig = await streamer.streamerInfo.findOne({username: streamer.username});
  constants.defaultCommands.forEach((command) => {
    if (!streamerConfig.commands.find((streamerCommand) => streamerCommand.command === command.command)) {
      streamerConfig.commands.push(command);
    }
  })
  await streamerConfig.save();
  streamer.syncCommands(streamerConfig);
  client.say(msgInfo.target, `All new default commands have been added`);
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
  const newCommand = divide[0].toLowerCase();
  if (streamer.hasCommand(newCommand)) {
    client.say(msgInfo.target, 'This command already exists');
    return;
  }
  const arguments = {
    modOnly: false,
    cooldown: 60,
    showInCommands: true,
    chanceToRun: 100,
  };
  let response;
  if (divide[1].startsWith('-')) {
    const argumentsRegex = noCommand.match(/-(i|v|m|a|(d"[\w .,'%$#@\(\)&)+]+")|(c\d+)|(%\d+))+/);
    if (argumentsRegex) {
      const argumentsString = noCommand.match(/-(i|v|m|a|(d"[\w .,'%$#@\(\)&)+]+")|(c\d+)|(%\d+))+/)[0];
      const argumentsSeparated = argumentsString.match(/i|v|m|a|(d"[\w .,'%$#@\(\)&)+]+")|(c\d+)|(%\d+)/g);
      argumentsSeparated.forEach((argument) => {
        if (argument === 'i') {
          arguments.showInCommands = false;
        } else if (argument === 'v') {
          arguments.showInCommands = true;
        } else if (argument === 'm') {
          arguments.modOnly = true;
        } else if (argument === 'a') {
          arguments.modOnly = false;
        } else if (argument.startsWith('c')) {
          arguments.cooldown = Number(argument.substring(1));
        } else if (argument.startsWith('%')) {
          arguments.chanceToRun = Number(argument.substring(1));
        } else if (argument.startsWith('d')) {
          arguments.description = argument.substring(2, argument.length-1);
        }
      })
      response = noCommand.substring(newCommand.length + argumentsString.length + 2);
    } else {
      client.say(msgInfo.target, 'Invalid command arguments');
      return;
    }
  } else {
    response = noCommand.substring(newCommand.length + 1);
  }
  streamer.addCommand({
    command: newCommand,
    ...arguments,
    isEnabled: true,
    response,
    defaultCommand: false,
  });
  client.say(msgInfo.target, `Command ${newCommand} has been added!`);
}

const deleteCommand = async (client, msgInfo, streamer) => {
  const command = msgInfo.msg.split(' ')[1];
  if (!streamer.hasCommand(command)) {
    client.say(msgInfo.target, 'This command doesn\'t exist');
    return;
  }
  const successful = streamer.deleteCommand(command);
  if (!successful) {
    client.say(msgInfo.target, 'You cannot delete default commands');
    return;
  }  
  client.say(msgInfo.target, 'Command successfully deleted');
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
        // The if statement seems random here, but it's for the edge case when someone removes the bot
        if (streamer) streamer.addXp(user, xp);
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
    console.error(`ERROR CHECKING IF LIVE: ${err.stack}`)
  }
}

// THEORETICALLY this should never exceed 3600, since Heroku is set to restart our app every hour
// This starts at -1 to make sure on startup it checks for live channels
let secondsSinceStart = -1;
const everySecond = async (streamers) => {
  secondsSinceStart++;
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

const toggleUserXP = (client, msgInfo, streamer) => {
  streamer.toggleUserXP(removeCommand(msgInfo.msg));
}

const editCommand = async (client, msgInfo, streamer) => {
  const noCommand = removeCommand(msgInfo.msg);
  const divide = noCommand.split(' ');
  const existingCommand = divide[0].toLowerCase();
  if (!streamer.hasCommand(existingCommand)) {
    client.say(msgInfo.target, "That command doesn't exist.");
    return;
  }
  const arguments = {};
  let response;
  if (divide[1].startsWith('-')) {
    const argumentsRegex = noCommand.match(/-(i|v|m|a|(d"[\w .,'%$#@\(\)&)+]+")|(c\d+)|(%\d+))+/);
    if (argumentsRegex) {
      const argumentsString = noCommand.match(/-(i|v|m|a|(d"[\w .,'%$#@\(\)&)+]+")|(c\d+)|(%\d+))+/)[0];
      const argumentsSeparated = argumentsString.match(/i|v|m|a|(d"[\w .,'%$#@\(\)&)+]+")|(c\d+)|(%\d+)/g);
      argumentsSeparated.forEach((argument) => {
        if (argument === 'i') {
          arguments.showInCommands = false;
        } else if (argument === 'v') {
          arguments.showInCommands = true;
        } else if (argument === 'm') {
          arguments.modOnly = true;
        } else if (argument === 'a') {
          arguments.modOnly = false;
        } else if (argument.startsWith('c')) {
          arguments.cooldown = Number(argument.substring(1));
        } else if (argument.startsWith('%')) {
          arguments.chanceToRun = Number(argument.substring(1));
        } else if (argument.startsWith('d')) {
          arguments.description = argument.substring(2, argument.length-1);
        }
      })
      response = noCommand.substring(existingCommand.length + argumentsString.length + 2);
    } else {
      client.say(msgInfo.target, 'Invalid command arguments');
      return;
    }
  } else {
    response = noCommand.substring(existingCommand.length + 1);
  }
  const botResponse = await streamer.editCommand(existingCommand, arguments, response);
  client.say(msgInfo.target, botResponse);
} 

const toggleDadJokes = async (client, msgInfo, streamer) => {
  if (await streamer.toggleDadJokes()) {
    client.say(msgInfo.target, "Dad jokes have been enabled on this stream.");
  } else {
    client.say(msgInfo.target, "Dad jokes have been disabled on this stream.");
  }
}

const optDadJokes = async (client, msgInfo, streamer) => {
  if (await streamer.optDadJokes(msgInfo.context['username'])) {
    client.say(msgInfo.target, "You have opted out of dad jokes for this stream.");
  } else {
    client.say(msgInfo.target, "You have opted into dad jokes for this stream.");
  }
}

const scheduleCommand = async (client, msgInfo, streamer) => {
  const message = removeCommand(msgInfo.msg).split(' ');
  if (message.length != 3) {
    client.say(msgInfo.target, 'Incorrect number of arguments');
  } else if (typeof(Number(message[1]).isNaN()|| typeof(Number(message[2]))).isNaN()){
    client.say(msgInfo.target, 'Second and third parameters must be numbers');
  } else if (message[1] < 60) {
    client.say(msgInfo.target, 'Cooldown must be 60 or greater');
  } else if (message[2] < (0-message[1])) {
    client.say(msgInfo.target, 'Offset must be greater than the negative of the cooldown');
  } else {
    streamer.scheduleCommand(message[0], Number(message[1]), Number(message[2]));
    client.say(msgInfo.target, 'Command scheduled!');
  }
}

const unscheduleCommand = async (client, msgInfo, streamer) => {
  const command = removeCommand(msgInfo.msg).split(' ');
  if (command.length != 1) {
    client.say(msgInfo.target, 'This command only takes one argument');
  } else {
    if (streamer.unscheduleCommand(command[0]))
      client.say(msgInfo.target, 'Command unscheduled!');
    else
      client.say(msgInfo.target, 'Command isn\'t scheduled');
  }
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
  addCommand,
  deleteCommand,
  toggleUserXP, 
  editCommand,
  toggleDadJokes,
  optDadJokes,
  scheduleCommand,
  unscheduleCommand,
}