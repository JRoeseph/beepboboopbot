const axios = require('axios');
const db = require('../database');
const Commands = require('./Commands');
const lib = require('./lib');

class Streamer {
    // Initialization for streamer on bot startup
    async init(username) {
        this.username = username;
        try {
            const streamerDocs = db.getConfig();
            const streamerConfig = await streamerDocs.findOne({username: this.username}).lean();
            let startingCommands;
            if (!streamerConfig) {
                startingCommands = await this.preinit();
            } else {
                startingCommands = {}
                streamerConfig.commands.forEach((command) => {
                    startingCommands[command.command] = {
                        // Here is where we check if the command has a function in lib
                        response: command.response.startsWith("#") ? lib[command.response.substring(1)] : command.response,
                        modOnly: command.modOnly,
                        cooldown: command.cooldown,
                        currentCooldown: 0,
                    }
                });
            }
            this.commands = new Commands();
            this.commands.init(startingCommands);
            const idResponse = await axios.get(`https://api.twitch.tv/helix/users?login=${username}`);
            this.broadcasterId = idResponse.data.data[0].id;
        } catch (err) {
            console.error(`STREAMER ERROR: ${err}`);
        }
    }

    runCommand(command, client, msgInfo) {
        if (!this.commands.doesCommandExist(command)) return;
        if (this.commands.hasPermission(command, msgInfo.context) && !this.commands.isOnCooldown(command)) {
            this.commands.runCommand(command, client, {...msgInfo, broadcasterId: this.broadcasterId});
        }
    }

    passTimeOnCommands() {
        this.commands.passTime();
    }

    // Preinit runs when the streamer is not in the config DB, meaning this is the first time they've been initialized
    async preinit() {
        try {
            const startingCommands = {
                'dadJoke': {
                    response: lib.dadJoke,
                    modOnly: false,
                    cooldown: 300,
                    currentCooldown: 0,
                },
                '!ping': {
                    response: lib.ping,
                    modOnly: false,
                    cooldown: 60,
                    currentCooldown: 0,
                },
                '!setTitle': {
                    reponse: lib.setTitle,
                    modOnly: true,
                    cooldown: 0,
                    currentCooldown: 0,
                },
                '!setCategory': {
                    reponse: lib.setCategory,
                    modOnly: true,
                    cooldown: 0,
                    currentCooldown: 0,
                }
            };
            const streamerDocs = db.getConfig();
            await streamerDocs.create({
                username: this.username,
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
                    }
                ]
            });
            return startingCommands;
        } catch (err) {
            throw err
    }
    }
}

module.exports = Streamer;