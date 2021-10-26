const axios = require('axios');
const removeCommand = (message) => {
  return message.split(' ').splice(1).join(' ');
}

const dadJoke = (client, msgInfo) => {
  const nameFirst = msgInfo.msg.substring(msgInfo.msg.indexOf(' ')+1);
  const name = nameFirst.endsWith('.') ? nameFirst.substring(0, nameFirst.length - 1) : nameFirst;
  client.say(msgInfo.target, `Hi "${name}", I'm BeepBoBoopBot!`);
  console.log(`* ${msgInfo.context.username} just got dad joked`)
}

const ping = (client, msgInfo) => {
  client.say(msgInfo.target, 'Pong!');
  console.log('* Executed "!ping" command');
}

const setTitle = async (client, msgInfo) => {
  client.say(msgInfo.target, '!setTitle command not yet implemented');
  console.log('* Executed "!setTitle" command');
}

const setCategory = (client, msgInfo) => {
  client.say(msgInfo.target, '!setCategory command not yet implemented');
  console.log('* Executed "!setCategory" command');
}

const everySecond = (streamers) => {
  streamers.forEach((streamer) => streamer.passTimeOnCommands());
}

module.exports = {
  dadJoke,
  ping,
  setTitle,
  setCategory,
  everySecond,
}