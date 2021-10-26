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
    const title = removeCommand(msgInfo.msg);
    try {
        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        }
        await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${msgInfo.broadcasterId}`, {title}, config);
        console.log('* Executed "!setTitle" command');
    } catch (err) {
        console.error(`Failed to execute "!setTitle": ${err}`);
    }
}

const setCategory = (client, msgInfo) => {

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