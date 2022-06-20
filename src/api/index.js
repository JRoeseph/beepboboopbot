const express = require('express');
const controllers = require('./controllers');
const path = require('path');

const initialize = async () => {
  const app = express();

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
  app.get('/api/leaderboard/:streamer', controllers.leaderboardAPI)
  app.get('/:streamer', controllers.profilePage);

  app.listen(process.env.PORT || 8004);
}

module.exports = {initialize};