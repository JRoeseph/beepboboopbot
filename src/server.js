require('dotenv').config();
const bot = require('./bot');
const api = require('./api');

bot.initialize();
api.initialize();