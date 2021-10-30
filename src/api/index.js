const express = require('express');
const controllers = require('./controllers');

const initialize = async () => {
  const app = express();

  app.get('/addBot', controllers.addBot);
  app.get('/removeBot', controllers.removeBot);
  app.get('/:streamer/leaderboard', controllers.leaderboard);
  app.get('/:streamer/commands', controllers.commands);

  app.listen(process.env.PORT || 8004);
}

module.exports = {initialize};