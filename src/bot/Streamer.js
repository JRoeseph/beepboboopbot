const axios = require('axios');
const db = require('../database');
const Commands = require('./Commands');
const lib = require('./lib');
const CryptoJS = require('crypto-js');

class Streamer {
  // Initialization for streamer on bot startup
  async init(username) {
    this.username = username;
    try {
      const streamerDocs = db.getConfig();
      this.userInfo = db.getStreamer(username);
      const streamerConfig = await streamerDocs.findOne({username: this.username}).lean();
      const decryptedBytes = await CryptoJS.AES.decrypt(streamerConfig.encryptedRefreshToken, process.env.REFRESH_TOKEN_ENCRYPTION_KEY);
      this.refreshToken = decryptedBytes.toString(CryptoJS.enc.Utf8);
      this.syncCommands(streamerConfig);
      const idResponse = await axios.get(`https://api.twitch.tv/helix/users?login=${username}`, {
        headers: {
          'Client-Id': process.env.CLIENT_ID,
          'Authorization': `Bearer ${process.env.API_TOKEN}`,
        }
      });
      this.broadcasterId = idResponse.data.data[0].id;
    } catch (err) {
      console.error(`STREAMER INIT ERROR: ${err}`);
    }
  }

  runCommand(command, msgInfo) {
    if (!this.commands.doesCommandExist(command)) return;
    if (this.commands.hasPermission(command, msgInfo.context) && !this.commands.isOnCooldown(command)) {
      this.commands.runCommand(command, this.client, msgInfo, this);
    }
  }

  passTimeOnCommands() {
    this.commands.passTime();
  }

  syncCommands(streamerConfig) {
    const startingCommands = {}
    streamerConfig.commands.forEach((command) => {
      startingCommands[command.command] = {
        // Here is where we check if the command has a function in lib
        response: command.response.startsWith("#") ? lib[command.response.substring(1)] : command.response,
        modOnly: command.modOnly,
        cooldown: command.cooldown,
        currentCooldown: 0,
      }
    });
    this.commands = new Commands();
    this.commands.init(startingCommands);
  }

  getUsers() {
    this.userInfo;
  }
  
  addClient(client) {
    this.client = client;
  }

  async addXp(user, xp) {
    const split = user.indexOf('#');
    const userid = user.substring(0, split);
    const username = user.substring(split+1);
    let userDoc = await this.userInfo.findOne({'user_id': userid})
    if (!userDoc) {
      await this.createUser(userid);
      userDoc = await this.userInfo.findOne({'user_id': userid})
    }
    userDoc.xp += xp;
    const xpRequired = (userDoc.level+1)*(userDoc.level+1)*16+100*(userDoc.level+1)-16;
    if (userDoc.xp >= xpRequired) {
      userDoc.level++;
      this.client.say(`#${this.username}`, `/me > ${username} just leveled up in ${this.username} to level ${userDoc.level}!`)
    }
    userDoc.save();
  }

  async createUser(userId) {
    await this.userInfo.create({
      user_id: userId,
      xp: 0,
      level: 0,
      rewardTokens: 0,
      customStreamerStuff: {},
    });
  }
}

module.exports = Streamer;