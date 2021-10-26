const lib = require('./lib');

class Commands {
  init(commands) {
    this.commands = commands;
  }

  passTime() {
    const keys = Object.keys(this.commands);
    keys.forEach((key) => {
        if (this.commands[key].currentCooldown) this.commands[key].currentCooldown--;
    });
  }

  doesCommandExist(command) {
    return !!this.commands[command];
  }

  isOnCooldown(command) {
    return this.commands[command].currentCooldown !== 0;
  }

  hasPermission(command, context) {
    return !this.commands[command].modOnly || context.mod || context.badges?.broadcaster === '1';
  }

  runCommand(commandName, client, msgInfo, streamer) {
    const command = this.commands[commandName];
    const response = command?.response;
    if (!response) {
        console.log(`* Unknown command ${commandName}`);
      } else if (typeof(response) === String) {
        client.say(response);
        command.currentCooldown = command.cooldown;
    } else {
        response(client, msgInfo, streamer)
        command.currentCooldown = command.cooldown;
    }
  }
}

module.exports = Commands;