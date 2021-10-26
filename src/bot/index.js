const tmi = require('tmi.js');
const handlers = require('./handlers.js')
const Streamer = require('./Streamer');
const db = require('../database');
const axios = require('axios');

const initialize = async () => {
    try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${process.env.API_TOKEN}`;
        axios.defaults.headers.common['Client-Id'] = 'y5o7q9tom9z1do6hi4466ttwr6vs8s';
      
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
        await db.init(streamerList);
    
        await Promise.all(streamerList.map(async (streamer) => {
        const streamerObj = new Streamer();
        await streamerObj.init(streamer);
        streamers.push(streamerObj);
        })); 
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
        console.log(`BOT INIT ERROR: ${err}`)
    }
}

module.exports = {initialize};