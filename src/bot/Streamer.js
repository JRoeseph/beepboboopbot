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
      console.error(`STREAMER ERROR: ${err}`);
    }
  }

  runCommand(command, client, msgInfo) {
    if (!this.commands.doesCommandExist(command)) return;
    if (this.commands.hasPermission(command, msgInfo.context) && !this.commands.isOnCooldown(command)) {
      this.commands.runCommand(command, client, msgInfo, this);
    }
  }

  passTimeOnCommands() {
    this.commands.passTime();
  }

  async syncCommands(streamerConfig) {
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
}

module.exports = Streamer;