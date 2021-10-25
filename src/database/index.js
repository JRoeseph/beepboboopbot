const mongoose = require('mongoose');
const schema = require('./schema');

class Connections {
    async init(streamerList) {
        try {
            this.streamers = {};
            await mongoose.connect(process.env.MONGO_URL);
            this.config = await mongoose.model('StreamerInfo', schema.streamer, 'StreamerInfo');
            await Promise.all(streamerList.map(async (streamer) => {
                this.streamers[streamer] = await mongoose.model(streamer, schema.user, streamer);
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