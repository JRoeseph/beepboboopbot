const Streamer = require('./Streamer');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const constants = require('./constants');
const mongoose = require('mongoose');
const schema = require('./schema');

class Streamers {
  async init() {
    try {
      await mongoose.connect(process.env.MONGO_URL);
      this.streamerInfo = await mongoose.model('StreamerInfo', schema.streamer, 'StreamerInfo');
    } catch (err) {
      console.error(`DB ERROR: ${err.stack}`);
    }
    try {
      let query = {}
      if (process.env.DEV_MODE === 'true') {
        query.username = 'beepboboopbot';
      } else {
        query.username = {
          $ne: 'beepboboopbot',
        }
      }
      const streamerDocs = await this.streamerInfo.find(query).lean();
      this.streamers = [];

      const apiQuery = streamerDocs.reduce((concat, streamer) => {
        return concat + `id=${streamer.broadcaster_id}&`
      }, '?');
      const usernameCheck = await axios.get(`https://api.twitch.tv/helix/users${apiQuery.substring(0, apiQuery.length-1)}`, {
          headers: {
            'Client-Id': process.env.CLIENT_ID,
            'Authorization': `Bearer ${process.env.API_TOKEN}`,
          }
      });
      const idToUsername = {};
      usernameCheck.data.data.forEach((user) => {
        idToUsername[user.id] = user.login;
      })
      await Promise.all(streamerDocs.map(async (doc) => {
        const streamerObj = new Streamer();
        await streamerObj.init(doc.broadcaster_id, idToUsername[doc.broadcaster_id], this.streamerInfo);
        this.streamers.push(streamerObj);
      }));
    } catch (err) {
      console.error(`STREAMERS INIT ERROR: ${err.stack}`)
    }
  }

  getStreamers() { 
    return this.streamers;
  }

  // We do this so we can retrieve either by broadcaster_id or by username
  getStreamer(id) {
    try {
      if (isNaN(id)) {
        return this.streamers.find((streamer) => streamer.username === id);
      } else {
        return this.streamers.find((streamer) => streamer.broadcaster_id === id);
      }
    } catch (err) {
      console.error(`GET STREAMER ERROR: ${err.stack}`)
    }
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
    const username = usernameResponse.data.data[0].login;
    await this.streamerInfo.deleteOne({username});
    const streamerIndex = this.streamers.findIndex((streamer) => streamer.username === username);
    const usersCollection = this.streamers[streamerIndex].getUsers();
    await usersCollection.collection.drop();
    delete this.streamers[streamerIndex];
    this.streamers.splice(streamerIndex, 1);
    this.client.part(username);
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
      const username = usernameResponse.data.data[0].login
      const broadcaster_id = usernameResponse.data.data[0].id;
      const encryptedRefreshToken = await CryptoJS.AES.encrypt(tokenResponse.data.refresh_token, process.env.REFRESH_TOKEN_ENCRYPTION_KEY).toString()
      await this.streamerInfo.create({
        username,
        broadcaster_id,
        encryptedRefreshToken,
        notifyLevelUp: true,
        commands: constants.defaultCommands,
      });
      const streamerObj = new Streamer();
      await streamerObj.init(broadcaster_id, username, this.streamerInfo);
      this.streamers.push(streamerObj);
      streamerObj.addClient(this.client);
      this.client.join(username)
    } catch (err) {
      console.error(`ERROR ADDING STREAMER: ${err.stack}`)
    }
  }

  addClients(client) {
    this.streamers.forEach((streamer) => streamer.addClient(client));
    this.client = client;
  }
}

module.exports = new Streamers();