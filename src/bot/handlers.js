const lib = require('./lib');

const onConnectedHandler = (client, addr, port, streamers) => {
  setInterval(lib.everySecond.bind(undefined, streamers), 1000);
  console.log(`* Connected to ${addr}:${port}, loaded for streamers ${streamers.getStreamers().map(streamer => streamer.username)}`);
}

const onMessageHandler = async (client, target, context, msg, self, streamers) => {
  try {
    if (self) return; 

    const streamer = streamers.getStreamer(target.substring(1));

    // We use two regexes here because if there is a period we only want to go to the end of the sentence
    let imJoke = msg.match(/(^| )[iI]'?[mM] [^.]*\./);
    if (imJoke) {
      // I'm replacing msg here with just the imJoke as a work around since most commands are workable with just the
      // message, but this one behaves differently
      streamer.runCommand('dadJoke', client, {target, context, msg: imJoke[0], self});
      return;
    } else {
      imJoke = msg.match(/(^| )[iI]'?[mM] [^.]*/);
      if (imJoke) {
        streamer.runCommand('dadJoke', client, {target, context, msg: imJoke[0], self});
        return;
      }
    }

    // Obviously, if it's not a command we don't care
    if (!msg.startsWith('!')) return;
    const commandName = msg.split(' ')[0];
    streamer.runCommand(commandName.toLowerCase(), client, {target, context, msg, self})
  } catch (err) {
    console.error(`HANDLER ERROR: ${err}`);
  }
}

module.exports = {
    onConnectedHandler,
    onMessageHandler,
}