const tmi = require('tmi.js');
const handlers = require('./handlers.js')
const streamers = require('./Streamers');
const db = require('../database');

const initialize = async () => {
  try {
    await db.init();
    await streamers.init();
    
    const opts = {
      identity: {
        username: 'BeepBoBoopBot',
        password: process.env.OAUTH_TOKEN,
      },
      // We spread and reform the array here so it is a copy of the array, because tmi is destructive with the array
      channels: [...streamers.getStreamers()]
    };
    
    const client = new tmi.client(opts);

    const onMessageHandler = (target, context, msg, self) => {
      handlers.onMessageHandler(client, target, context, msg, self, streamers)
    }

    const onConnectedHandler = async(addr, port) => {
      handlers.onConnectedHandler(client, addr, port, streamers)
    }

    // Register our event handlers (defined below)
    client.on('message', onMessageHandler);
    client.on('connected', onConnectedHandler);

    // Connect to Twitch:
    client.connect();
  } catch (err) {
      console.error(`BOT INIT ERROR: ${err}`)
  }
}

module.exports = {initialize};