const dadJoke = (client, msgInfo) => {
    const name = msgInfo.msg.substring(msgInfo.msg.indexOf(' ')+1);
    client.say(msgInfo.target, `Hi "${name}", I'm BeepBoBoopBot!`);
    console.log(`* ${msgInfo.context.username} just got dad joked`)
}

const ping = (client, msgInfo) => {
    client.say(msgInfo.target, 'Pong!');
    console.log(`* Executed ${commandName} command`);
}

const setTitle = (client, msgInfo) => {

}

const setCategory = (client, msgInfo) => {

}

module.exports = {
    dadJoke,
    ping,
    setTitle,
    setCategory,
}