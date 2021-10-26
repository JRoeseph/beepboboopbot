const db = require('../database');
const Streamer = require('./Streamer');
const axios = require('axios');

class Streamers {
  async init() {
    const streamerInfo = db.getConfig();
    const streamerDocs = await streamerInfo.find({}).lean();
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
    return this.streamers.find((streamer) => {
      const existingUsername = streamer.username;
      existingUsername.toLowerCase() === username.toLowerCase()
    });
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
      await streamerInfo.create({
        username: usernameResponse.data.data[0].login,
        encryptedRefreshToken: tokenResponse.data.refresh_token,
        commands: [
          {
            command: 'dadJoke',
            response: '#dadJoke',
            modOnly: false,
            cooldown: 300,
          },
          {
            command: '!ping',
            response: '#ping',
            modOnly: false,
            cooldown: 60,
          },
          {
            command: '!setTitle',
            response: '#setTitle',
            modOnly: true,
            cooldown: 0,
          },
          {   
            command: '!setCategory',
            response: '#setCategory',
            modOnly: true,
            cooldown: 0,
          },
          {
            command: '!addBot',
            response: 'Want to add BeepBoBoopBot to your own channel? Click this link: https://id.twitch.tv/oauth2/authorize?client_id=y5o7q9tom9z1do6hi4466ttwr6vs8s&redirect_uri=http://localhost:8004/addBot&response_type=code&scope=channel:manage:broadcast',
            modOnly: false,
            cooldown: 60,
          },
          {
            command: '!removeBot',
            response: 'To remove the bot, the broadcaster must click this link: https://id.twitch.tv/oauth2/authorize?client_id=y5o7q9tom9z1do6hi4466ttwr6vs8s&redirect_uri=http://localhost:8004/removeBot&response_type=code',
            modOnly: true,
            cooldown: 60,
          }
        ],
      });
    } catch (err) {
      console.error(`ERROR ADDING STREAMER: ${err}`)
    }
  }
}

module.exports = new Streamers();