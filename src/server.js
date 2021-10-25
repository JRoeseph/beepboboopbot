const tmi = require('tmi.js');
require('dotenv').config();
const handlers = require('./tmi/handlers.js')
const Streamer = require('./tmi/Streamer');
const db = require('./database');

try {
  const streamerList = process.env.STREAMER_LIST.split(',')

  const opts = {
    identity: {
      username: 'BeepBoBoopBot',
      password: process.env.OAUTH_TOKEN,
    },
    // We spread and reform the array here so it is a copy of the array, because tmi is destructive with the array
    channels: [...streamerList]
  };

  // await calls have to be in async functions, so we make one here. We do this since db.init() must happen before
  // the streamer objects are formed
  const streamers = [];
  const init = async () => {
    await db.init(streamerList);

    await Promise.all(streamerList.map(async (streamer) => {
      const streamerObj = new Streamer();
      await streamerObj.init(streamer);
      streamers.push(streamerObj);
    })); 
  }
  init();

  // Create a client with our options
  const client = new tmi.client(opts);

  const onMessageHandler = (target, context, msg, self) => {
    handlers.onMessageHandler(client, target, context, msg, self, streamers)
  }

  const onConnectedHandler = (addr, port) => {
    handlers.onConnectedHandler(client, addr, port, streamerList)
  }

  // Register our event handlers (defined below)
  client.on('message', onMessageHandler);
  client.on('connected', onConnectedHandler);

  // Connect to Twitch:
  client.connect();
} catch (err) {
  console.error(`BOOT ERROR: ${err}`);
}
