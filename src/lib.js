const imJoke = (client, message, target, sender) => {
    const name = message[0].substring(message[0].indexOf(' ')+1);
    client.say(target, `Hi "${name}", I'm BeepBoBoopBot!`);
    console.log(`* ${sender} just got dad joked`)
}

module.exports = {
    imJoke,
}