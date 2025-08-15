const mongoose = require("mongoose");
const Schema = mongoose.Schema;



//注册接口模型
const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    nickname: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now
    }
})

module.exports = User = mongoose.model("User", userSchema)