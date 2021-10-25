const rollDice = () => {
    const sides = 6;
    return Math.floor(Math.random() * sides) + 1;
}

const imJoke = (client, message, target) => {
    const name = message[0].substring(message[0].indexOf(' ')+1);
    client.say(target, `Hi "${name}", I'm BeepBoBoopBot!`);
}

module.exports = {
    rollDice,
    imJoke,
}