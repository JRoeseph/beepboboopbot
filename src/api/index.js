const express = require('express');
const controllers = require('./controllers');

const initialize = async () => {
  const app = express();

  app.get('/addBot', controllers.addBot);

  app.listen(8004);
}

module.exports = {initialize};