const mongoose = require('mongoose');
const schema = require('./schema.js');

class Connections {
    async init(streamerList) {
        streamerList.forEach((streamer) => {
            const connection = await mongoose.createConnection(`${process.env.MONGO_URL}${streamer}?${process.env.MONGO_QUERY_PARAMS}`)
            this.streamers[streamer] = await connection.model('UserInfo', schema)
        })
    }

    getModel(streamer) {
        return this.streamers[streamer]
    }
}

module.exports = Connections;