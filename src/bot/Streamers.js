const db = require('../database');
const Streamer = require('./Streamer');
const axios = require('axios');
const CryptoJS = require('crypto-js');

class Streamers {
  async init() {
    const streamerInfo = db.getConfig();
    let query = {}
    if (process.env.DEV_MODE === 'true') {
      query.username = 'beepboboopbot';
    } else {
      query.username = {
        $ne: 'beepboboopbot',
      }
    }
    const streamerDocs = await streamerInfo.find(query).lean();
    this.streamers = [];

    await Promise.all(streamerDocs.map(async (doc) => {
      const streamerObj = new Streamer();
      await streamerObj.init(doc.username);
      this.streamers.push(streamerObj);
    }));
  }

  getStreamers() { 
    return this.streamers 
  };

  getStreamer(username) { 
    return this.streamers.find((streamer) => streamer.username === username);
  }

  async removeStreamer(code) {
    const tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?code=${code}&client_secret=${process.env.CLIENT_SECRET}&client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}addBot&grant_type=authorization_code`)
    const usernameResponse = await axios.get(`https://api.twitch.tv/helix/users`, 
      {
        headers: {
          'Client-Id': process.env.CLIENT_ID,
          'Authorization': `Bearer ${tokenResponse.data.access_token}`,
        }
      });
    const streamerInfo = db.getConfig();
    const username = usernameResponse.data.data[0].login;
    await streamerInfo.deleteOne({username});
    const streamerIndex = this.streamers.find((streamer) => {streamer.username === username});
    this.streamers.splice(streamerIndex, 1);
  }

  async addStreamer(code) {
    try {
      const tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?code=${code}&client_secret=${process.env.CLIENT_SECRET}&client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}addBot&grant_type=authorization_code`)
      const usernameResponse = await axios.get(`https://api.twitch.tv/helix/users`, 
        {
          headers: {
            'Client-Id': process.env.CLIENT_ID,
            'Authorization': `Bearer ${tokenResponse.data.access_token}`,
          }
        });
      const streamerInfo = db.getConfig();
      const username = usernameResponse.data.data[0].login
      const encryptedRefreshToken = await CryptoJS.AES.encrypt(tokenResponse.data.refresh_token, process.env.REFRESH_TOKEN_ENCRYPTION_KEY).toString()
      await streamerInfo.create({
        username,
        encryptedRefreshToken,
        commands: [
          {
            command: 'dadjoke',
            response: '#dadJoke',
            modOnly: false,
            cooldown: 300,
            defaultCommand: true,
          },
          {
            command: '!ping',
            response: '#ping',
            modOnly: false,
            cooldown: 60,
            defaultCommand: true,
          },
          {
            command: '!settitle',
            response: '#setTitle',
            modOnly: true,
            cooldown: 0,
            defaultCommand: true,
          },
          {   
            command: '!setcategory',
            response: '#setCategory',
            modOnly: true,
            cooldown: 0,
            defaultCommand: true,
          },
          {
            command: '!addbot',
            response: 'Want to add BeepBoBoopBot to your own channel? Click this link: https://id.twitch.tv/oauth2/authorize?client_id=y5o7q9tom9z1do6hi4466ttwr6vs8s&redirect_uri=https://beepboboopbot.herokuapp.com/addBot&response_type=code&scope=channel:manage:broadcast',
            modOnly: false,
            cooldown: 60,
            defaultCommand: true,
          },
          {
            command: '!removebot',
            response: 'To remove the bot, the broadcaster must click this link: https://id.twitch.tv/oauth2/authorize?client_id=y5o7q9tom9z1do6hi4466ttwr6vs8s&redirect_uri=https://beepboboopbot.herokuapp.com/removeBot&response_type=code',
            modOnly: true,
            cooldown: 60,
            defaultCommand: true,
          },
          {
            command: '!resetdefaultcommands',
            response: '#resetDefaultCommands',
            modOnly: true,
            cooldown: 0,
            defaultCommand: true,
          }
        ],
      });
      const streamerObj = new Streamer();
      await streamerObj.init(username);
      this.streamers.push(streamerObj);
    } catch (err) {
      console.error(`ERROR ADDING STREAMER: ${err}`)
    }
  }
}

module.exports = new Streamers();