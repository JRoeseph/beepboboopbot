const axios = require('axios');
const db = require('../database');
const Commands = require('./Commands');
const lib = require('./lib');
const CryptoJS = require('crypto-js');
const constants = require('./constants');

class Streamer {
  // Initialization for streamer on bot startup
  async init(broadcaster_id, username) {
    this.broadcaster_id = broadcaster_id;
    this.isLive = true;
    try {
      const streamerDocs = db.getConfig();
      this.userInfo = db.getStreamer(broadcaster_id);
      this.streamerConfig = await streamerDocs.findOne({broadcaster_id});
      const decryptedBytes = await CryptoJS.AES.decrypt(this.streamerConfig.encryptedRefreshToken, process.env.REFRESH_TOKEN_ENCRYPTION_KEY);
      this.refreshToken = decryptedBytes.toString(CryptoJS.enc.Utf8);
      this.username = this.streamerConfig.username;
      this.notifyLevelUp = this.streamerConfig.notifyLevelUp;
      constants.defaultCommands.forEach((command) => {
        if (!this.streamerConfig.commands.find((streamerCommand) => streamerCommand.command === command.command)) {
          this.streamerConfig.commands.push(command);
        }
      })
      await this.streamerConfig.save();
      this.syncCommands(this.streamerConfig);
      if (username !== this.streamerConfig.username) {
        this.streamerConfig.username = username;
        this.streamerConfig.save();
      };
    } catch (err) {
      console.error(`STREAMER INIT ERROR: ${err}`);
    }
  }

  runCommand(command, msgInfo) {
    if (!this.commands.doesCommandExist(command) || !this.commands.isCommandEnabled(command)) return;
    if (this.commands.hasPermission(command, msgInfo.context) && !this.commands.isOnCooldown(command) && this.commands.randomChance(command)) {
      this.commands.runCommand(command, this.client, msgInfo, this);
    }
  }

  passTimeOnCommands() {
    this.commands.passTime();
  }

  syncCommands() {
    const startingCommands = {}
    this.streamerConfig.commands.forEach((command) => {
      startingCommands[command.command] = {
        // Here is where we check if the command has a function in lib
        response: command.response.startsWith("#") ? lib[command.response.substring(1)] : command.response,
        description: command.description,
        modOnly: command.modOnly,
        cooldown: command.cooldown,
        isEnabled: command.isEnabled,
        showInCommands: command.showInCommands,
        defaultCommand: command.defaultCommand,
        chanceToRun: command.chanceToRun,
        currentCooldown: 0,
      }
    });
    this.commands = new Commands();
    this.commands.init(startingCommands);
  }

  async getUsers() {
    return this.userInfo;
  }
  
  addClient(client) {
    this.client = client;
  }

  async getUserLevel(username) {
    const userDoc = await this.userInfo.findOne({username: username.toLowerCase()}).lean();
    const rank = (await this.userInfo.countDocuments({xp: {$gt: userDoc.xp}, xpEnabled: true}))+1;
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
    if (!userDoc.xpEnabled) {
      return;
    }
    userDoc.xp += xp;
    const xpRequired = (userDoc.level+1)*(userDoc.level+1)*16+100*(userDoc.level+1)-16;
    if (userDoc.xp >= xpRequired) {
      userDoc.level++;
      if (this.notifyLevelUp) {
        this.client.say(`#${this.username}`, `/me > ${username} just leveled up in ${this.username} to level ${userDoc.level}!`)
      }
    }
    userDoc.save();
  }

  async toggleUserXP(username) {
    const userDoc = await this.userInfo.findOne({username: username.toLowerCase()})
    if (!userDoc) {
      this.client.say(`User not found. User must have chatted in the past`);
      return;
    }
    userDoc.xpEnabled = !userDoc.xpEnabled;
    userDoc.save();
    if (userDoc.xpEnabled) {
      this.client.say(`#${this.username}`, `XP has been enabled for ${username}`)
    } else {
      this.client.say(`#${this.username}`, `XP has been disabled for ${username}`)
    }
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

  async toggleCommand(command) {
    const commandObj = this.streamerConfig.commands.find((streamerCommand)=> command.toLowerCase() === streamerCommand.command);
    if (!commandObj) {
      return "Nope";
    }
    commandObj.isEnabled = !commandObj.isEnabled;
    await this.streamerConfig.save();
    this.syncCommands();
    return commandObj.isEnabled;
  }

  toggleLevelUpNotifications() {
    this.notifyLevelUp = !this.notifyLevelUp;
    this.streamerConfig.notifyLevelUp = this.notifyLevelUp;
    this.streamerConfig.save();
  }

  getCommands() {
    return this.commands.getCommands();
  }

  async addCommand(commandInfo) {
    this.streamerConfig.commands.push(commandInfo);
    await this.streamerConfig.save();
    this.syncCommands();
  }

  hasCommand(commandName) {
    return this.commands.doesCommandExist(commandName);
  }
  
  deleteCommand(commandName) {
    const commandArray = this.streamerConfig.commands;
    const commandIndex = commandArray.findIndex((command) => command.command === commandName);
    if (commandArray[commandIndex].defaultCommand) {
      return false;
    }
    commandArray.splice(commandIndex, 1);
    this.streamerConfig.save();
    this.commands.deleteCommand(commandName);
    return true;
  }
}

module.exports = Streamer;