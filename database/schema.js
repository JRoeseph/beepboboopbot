const Schema = mongoose.Schema;

const UserInfo = new Schema({
    username: String,
    minutesWatched: Number,
    rewardTokens: Number,
    customStreamerStuff: Object,
})