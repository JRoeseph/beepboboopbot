const express = require('express');
const controllers = require('./controllers');
const path = require('path');
const cors = require('cors');

const initialize = async () => {
  const app = express();

  app.use(cors());
  app.use(express.static(path.join(__dirname, '/html')));
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '/html'));
  //IDK why this is needed but it is for errors not to be thrown
  app.use('/favicon.ico', (req, res, next) => {
    res.sendStatus(200);
  });

  app.get('/addBot', controllers.addBot);
  app.get('/removeBot', controllers.removeBot);
  app.get('/api/streamers', controllers.streamersAPI)
  app.get('/api/:streamer/leaderboard', controllers.leaderboardAPI);
  app.get('/api/:streamer/details', controllers.detailsAPI);
  app.get('/api/:streamer/commands', controllers.commandsAPI)
  app.get('/:streamer', controllers.profilePage);

  app.listen(process.env.PORT || 8004);
}

module.exports = {initialize};