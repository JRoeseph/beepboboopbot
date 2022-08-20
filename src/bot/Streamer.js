const Commands = require('./Commands');
const lib = require('./lib');
const CryptoJS = require('crypto-js');
const constants = require('./constants');
const mongoose = require('mongoose');
const schema = require('./schema');

class Streamer {
  // Initialization for streamer on bot startup
  async init(broadcaster_id, username, streamerInfo) {
    this.broadcaster_id = broadcaster_id;
    this.isLive = true;
    this.streamerInfo = streamerInfo;
    try {
      this.userInfo = await mongoose.model(`bc${broadcaster_id}`, schema.user, `bc${broadcaster_id}`);
      this.streamerConfig = await this.streamerInfo.findOne({broadcaster_id});
      this.verifyAttributes();
      const decryptedBytes = await CryptoJS.AES.decrypt(this.streamerConfig.encryptedRefreshToken, process.env.REFRESH_TOKEN_ENCRYPTION_KEY);
      this.refreshToken = decryptedBytes.toString(CryptoJS.enc.Utf8);
      this.username = this.streamerConfig.username;
      this.notifyLevelUp = this.streamerConfig.notifyLevelUp;
      this.hasDadJokes = this.streamerConfig.hasDadJokes;
      this.optedOutDadJokes = this.streamerConfig.optedOutDadJokes;
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
      console.error(`STREAMER INIT ERROR: ${err.stack}`);
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

  getUsers() {
    return this.userInfo;
  }
  
  addClient(client) {
    this.client = client;
  }

  async getUserLevel(username) {
    const userDoc = await this.userInfo.findOne({username: username.toLowerCase()}).lean();
    if (!userDoc) return {xp: -1, requiredXP: -1, level: -1, rank: -1}
    const rank = (await this.userInfo.countDocuments({$and: [{xp: {$gt: userDoc.xp}}, {$or: [{xpEnabled: true}, {xpEnabled: {$exists: 0}}]}]}))+1;
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
    if (userDoc.xpEnabled === false) {
      return;
    }
    if (userDoc.username != username) {
      userDoc.username = username;
    }
    userDoc.xp += xp;
    const xpRequired = (userDoc.level+1)*(userDoc.level+1)*16+100*(userDoc.level+1)-16;
    if (userDoc.xp >= xpRequired) {
      userDoc.level++;
      // We do !== false in the cases where it doesn't exist for some reason so it defaults to true
      if (this.notifyLevelUp !== false) {
        this.client.say(`#${this.username}`, `/me > ${username} just leveled up in ${this.username} to level ${userDoc.level}!`)
      }
    }
    userDoc.save();
  }

  async toggleUserXP(username) {
    const userDoc = await this.userInfo.findOne({username: username.toLowerCase()})
    if (!userDoc) {
      this.client.say(`#${this.username}`, `User not found. User must have chatted in the past (since the bot was added)`);
      return;
    }
    if (userDoc.xpEnabled === undefined) {
      userDoc.xpEnabled = false;
    } else {
      userDoc.xpEnabled = !userDoc.xpEnabled;
    }
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

  async editCommand(commandName, newArguments, newResponse) {
    const commandObj = this.streamerConfig.commands.find((command) => command.command === commandName);
    if (commandObj.defaultCommand && newResponse) {
      return `You cannot edit the response of a default command`;
    }
    const argumentKeys = Object.keys(newArguments);
    argumentKeys.forEach((argument) => {
      commandObj[argument] = newArguments[argument];
    });
    if (newResponse) {
      commandObj.response = newResponse;
    }
    this.streamerConfig.save();
    this.syncCommands();
    return `Edited command ${commandName}`;
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

  async optDadJokes(username) {
    if (this.optedOutDadJokes.includes(username)) {
      this.optedOutDadJokes.remove(username);
      this.streamerConfig.optedOutDadJokes.remove(username);
      this.streamerConfig.save();
      return false;
    } else {
      this.optedOutDadJokes.push(username);
      this.streamerConfig.optedOutDadJokes.push(username);
      this.streamerConfig.save();
      return true;
    }
  }

  async toggleDadJokes() {
    this.hasDadJokes = !this.hasDadJokes;
    this.streamerConfig.hasDadJokes = this.hasDadJokes;
    this.streamerConfig.save();
    return this.hasDadJokes;
  }

  async hasDadJokesForUser(username) {
    if (this.hasDadJokes && !this.optedOutDadJokes.includes(username)) 
      return true;
    return false;
  }

  verifyAttributes() {
    if (this.streamerConfig.hasDadJokes === undefined) this.streamerConfig.hasDadJokes = false;
    if (this.streamerConfig.optedOutDadJokes === undefined) this.streamerConfig.optedOutDadJokes = [];
  }
}

module.exports = Streamer;