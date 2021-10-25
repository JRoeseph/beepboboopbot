const lib = require('./lib');

const onConnectedHandler = (client, addr, port) => {
    console.log(`* Connected to ${addr}:${port}`);
}

const onMessageHandler = (client, target, context, msg, self) => {
    if (self) { return; }
  
    const commandName = msg.trim();
  
    if (commandName === '!dice') {
      const num = lib.rollDice();
      client.say(target, `You rolled a ${num}`);
      console.log(`* Executed ${commandName} command`);
    } else {
      console.log(`* Unknown command ${commandName}`);
    }
}

module.exports = {
    onConnectedHandler,
    onMessageHandler,
}