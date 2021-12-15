const lib = require('./lib');

const onConnectedHandler = (client, addr, port, streamers) => {
  setInterval(lib.everySecond.bind(undefined, streamers), 1000);
  console.log(`* Connected to ${addr}:${port}, loaded for streamers ${streamers.getStreamers().map(streamer => streamer.username)}`);
}

const onMessageHandler = async (client, target, context, msg, self, streamers) => {
  try {
    if (self) return; 
    const streamer = streamers.getStreamer(target.substring(1));
    if (!streamer?.isLive && process.env.DEV_MODE === 'false' && target.substring(1) !== 'beepboboopboy') return;

    lib.setActive(context['user-id'], context.username, target.substring(1))

    // We use two regexes here because if there is a period we only want to go to the end of the sentence
    let imJoke = msg.match(/(^| )[iI]('?[mM]| [aA][mM]) [^,.]+[.,]/);
    if (imJoke) {
      // I'm replacing msg here with just the imJoke as a work around since most commands are workable with just the
      // message, but this one behaves differently
      imJoke = imJoke[0].substring(0, imJoke[0].length-1);
      streamer.runCommand('dadjoke', {target, context, msg: imJoke, self});
      return;
    } else {
      imJoke = msg.match(/(^| )[iI]('?[mM]| [aA][mM]) [^./]+/);
      if (imJoke) {
        streamer.runCommand('dadjoke', {target, context, msg: imJoke[0], self});
        return;
      }
    }

    const commandName = msg.split(' ')[0];
    streamer.runCommand(commandName.toLowerCase(), {target, context, msg, self})
  } catch (err) {
    console.error(`HANDLER ERROR: ${err}`);
  }
}

module.exports = {
    onConnectedHandler,
    onMessageHandler,
}