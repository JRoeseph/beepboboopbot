const axios = require('axios');
const db = require('../database');
const Commands = require('./Commands');
const lib = require('./lib');
const CryptoJS = require('crypto-js');
const { client } = require('tmi.js');

class Streamer {
  // Initialization for streamer on bot startup
  async init(broadcaster_id) {
    this.broadcaster_id = broadcaster_id;
    try {
      const streamerDocs = db.getConfig();
      this.userInfo = db.getStreamer(broadcaster_id);
      const streamerConfig = await streamerDocs.findOne({broadcaster_id});
      const decryptedBytes = await CryptoJS.AES.decrypt(streamerConfig.encryptedRefreshToken, process.env.REFRESH_TOKEN_ENCRYPTION_KEY);
      this.refreshToken = decryptedBytes.toString(CryptoJS.enc.Utf8);
      this.username = streamerConfig.username;
      this.syncCommands(streamerConfig);

      // In order to support username changes through Twitch, we check the username here to see if it still matches our
      // DB, and updates it if it doesn't
      const usernameCheck = await axios.get(`https://api.twitch.tv/helix/users?id=${broadcaster_id}`, {
        headers: {
          'Client-Id': process.env.CLIENT_ID,
          'Authorization': `Bearer ${process.env.API_TOKEN}`,
        }
      });
      const username = usernameCheck.data.data[0].login;
      if (username !== this.username) {
        streamerConfig.username = username;
        await streamerConfig.save(); 
        this.username = username;
      };
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
    return this.userInfo;
  }
  
  addClient(client) {
    this.client = client;
  }

  async getUserLevel(user_id) {
    const userDoc = await this.userInfo.findOne({user_id}).lean();
    const rank = await this.userInfo.countDocuments({xp: {$gt: userDoc.xp}});
    const requiredXP = 16*(userDoc.level+1)*(userDoc.level+1)+100*(userDoc.level+1)-16;
    return {xp: userDoc.xp, requiredXP, level: userDoc.level, rank};
  }

  async addXp(user, xp) {
    const split = user.indexOf('#');
    const userid = user.substring(0, split);
    const username = user.substring(split+1);
    let userDoc = await this.userInfo.findOne({'user_id': userid})
    if (!userDoc) {
      await this.createUser(userid, username);
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

  async createUser(userId, username) {
    await this.userInfo.create({
      user_id: userId,
      username,
      xp: 0,
      level: 0,
      rewardTokens: 0,
      customStreamerStuff: {},
    });
  }
}

module.exports = Streamer;