const express = require('express');
const controllers = require('./controllers');
const path = require('path');

const initialize = async () => {
  const app = express();

  app.use(express.static(path.join(__dirname, '/html')));
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '/html'));

  app.get('/addBot', controllers.addBot);
  app.get('/removeBot', controllers.removeBot);
  app.get('/:streamer', controllers.profile);

  app.listen(process.env.PORT || 8004);
}

module.exports = {initialize};