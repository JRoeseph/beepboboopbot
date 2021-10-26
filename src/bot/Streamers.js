const db = ('../database');
const Streamer = require('./Streamer');

class Streamers {
  async init() {
    const streamerInfo = db.getConfig();
    const streamerDocs = await streamerInfo.find({}).lean();
    this.streamers = [];

    await Promise.all(streamerDocs.map((doc) => {
      const streamerObj = new Streamer();
      await streamerObj.init(doc.username);
      this.streamers.push(streamerObj);
    }));
  }

  getStreamers() { return this.streamers };
}

module.exports = new Streamers();