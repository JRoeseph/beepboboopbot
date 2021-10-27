const defaultCommands = [
  {
    command: 'dadjoke',
    response: '#dadJoke',
    modOnly: false,
    cooldown: 300,
    defaultCommand: true,
  },
  {
    command: '!ping',
    response: '#ping',
    modOnly: false,
    cooldown: 60,
    defaultCommand: true,
  },
  {
    command: '!settitle',
    response: '#setTitle',
    modOnly: true,
    cooldown: 0,
    defaultCommand: true,
  },
  {   
    command: '!setcategory',
    response: '#setCategory',
    modOnly: true,
    cooldown: 0,
    defaultCommand: true,
  },
  {
    command: '!addbot',
    response: 'Want to add BeepBoBoopBot to your own channel? Click this link: https://id.twitch.tv/oauth2/authorize?client_id=y5o7q9tom9z1do6hi4466ttwr6vs8s&redirect_uri=https://beepboboopbot.herokuapp.com/addBot&response_type=code&scope=channel:manage:broadcast',
    modOnly: false,
    cooldown: 60,
    defaultCommand: true,
  },
  {
    command: '!removebot',
    response: 'To remove the bot, the broadcaster must click this link: https://id.twitch.tv/oauth2/authorize?client_id=y5o7q9tom9z1do6hi4466ttwr6vs8s&redirect_uri=https://beepboboopbot.herokuapp.com/removeBot&response_type=code',
    modOnly: true,
    cooldown: 60,
    defaultCommand: true,
  },
  {
    command: '!level',
    response: '#getLevel',
    description: 'This command responds to the user with their xp and level',
    modOnly: false,
    cooldown: 10,
    defaultCommand: true,
  },
  {
    command: '!leaderboard',
    response: '#getLeaderboardURL',
    description: 'This command give the link to the channel\'s xp leaderboard',
    modOnly: false,
    cooldown: 60,
    defaultCommand: true,
  },
  {
    command: '!togglelevelupnotifications',
    response: '#toggleLevelUpNotifications',
    description: 'This command toggles the level up notifications that appear in chat',
    modOnly: true,
    cooldown: 0,
    defaultCommand: true,
  },
  {
    command: '!resetdefaultcommands',
    response: '#resetDefaultCommands',
    modOnly: true,
    cooldown: 0,
    defaultCommand: true,
  }
]

module.exports = {
  defaultCommands,
}