const lib = require('./lib');

class Commands {
    init(commands) {
        this.commands = commands;
    }

    isOnCooldown(command) {
        return this.commands[command].currentCooldown !== 0;
    }

    hasPermission(command, context) {
        return !this.commands[command].modOnly || context.mod;
    }

    runCommand(commandName, client, msgInfo) {
        const command = this.commands[commandName];
        const response = command?.response;
        if (!response) {
            console.log(`* Unknown command ${commandName}`);
         } else if (typeof(response) === String) {
            client.say(response);
            // TODO: Uncomment this code and below once cooldowns have been implemented
            // command.currentCooldown = command.cooldown;
        } else {
            response(client, msgInfo)
            // command.currentCooldown = command.cooldown;
        }
    }
}

module.exports = Commands;