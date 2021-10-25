const tmi = require('tmi.js');
require('dotenv').config();
const handlers = require('./handlers.js')

// Define configuration options
const opts = {
  identity: {
    username: 'BeepBoBoopBot',
    password: process.env.OAUTH_TOKEN,
  },
  channels: [
    'JRoeseph'
  ]
};

// Create a client with our options
const client = new tmi.client(opts);

const onMessageHandler = (target, context, msg, self) => {
  handlers.onMessageHandler(client, target, context, msg, self)
}

const onConnectedHandler = (addr, port) => {
  handlers.onConnectedHandler(client, addr, port)
}

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

