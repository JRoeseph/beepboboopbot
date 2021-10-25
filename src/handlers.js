const lib = require('./lib');

const onConnectedHandler = (client, addr, port) => {
    console.log(`* Connected to ${addr}:${port}`);
}

const onMessageHandler = (client, target, context, msg, self) => {
    if (self) return; 
  
    // We use two regexes here because if there is a period we only want to go to the end of the sentence
    let imJoke = msg.match(/(^| )[iI]'?[mM][\w ]*\./);
    if (imJoke) {
      lib.imJoke(client, imJoke, target);
    } else {
      imJoke = msg.match(/(^| )[iI]'?[mM][\w ]*/);
      if (imJoke) lib.imJoke(client, imJoke, target);
    }

    // Obviously, if it's not a command we don't care
    if (!msg.startsWith('!')) return;
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