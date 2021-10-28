const mongoose = require('mongoose');
const schema = require('./schema');

class Connections {
  async init() {
    try {
      this.streamers = {};
      await mongoose.connect(process.env.MONGO_URL);
      this.config = await mongoose.model('StreamerInfo', schema.streamer, 'StreamerInfo');
      const streamerList = await this.config.find({}).lean();
      await Promise.all(streamerList.map(async (streamer) => {
        this.streamers[streamer.broadcaster_id] = await mongoose.model(`bc${streamer.broadcaster_id}`, schema.user, `bc${streamer.broadcaster_id}`);
      }));
    } catch (err) {
      console.error(`DB ERROR: ${err}`);
    }
  }

  getConfig() {
    return this.config;
  }

  getStreamer(streamer) {
    return this.streamers[streamer]
  }
}

module.exports = new Connections();