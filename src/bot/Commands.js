class Commands {
  init(commands) {
    this.commands = commands;
  }

  getCommands() {
    return this.commands;
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

  isCommandEnabled(command) {
    return this.commands[command].isEnabled;
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
        console.log(`* Response error ${commandName}`);
        // Why is string lowercase what is wrong with you JavaScript?!?!?
      } else if (typeof(response) === 'string') {
        client.say(msgInfo.target, response);
        command.currentCooldown = command.cooldown;
    } else {
        response(client, msgInfo, streamer)
        command.currentCooldown = command.cooldown;
    }
    console.log(`* Executed ${commandName} command`);
  }

  randomChance(commandName) {
    const command = this.commands[commandName];
    if (command.chanceToRun === undefined) return true;
    else return Math.random() + (0.01 * command.chanceToRun) > 1;
  }

  deleteCommand(commandName) {
    delete this.commands[commandName];
  }
}

module.exports = Commands;