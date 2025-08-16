const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// 微信小程序用户模型
const userSchema = new Schema({
    openid: {
        type: String,
        required: true,
        unique: true
    },
    unionid: {
        type: String,
        default: null
    },
    phone: {
        type: String,
        default: null
    },
    nickname: {
        type: String,
        default: function() {
            return `未命名_${Math.random().toString(36).substr(2, 5)}`;
        }
    },
    avatar: {
        type: String,
        default: 'https://q8.itc.cn/q_70/images03/20240305/5637ad3f16d144ecb5469acbde2b67c7.jpeg'
    },
    gender: {
        type: Number,
        default: 0 // 0: 未知, 1: 男, 2: 女
    },
    // 推荐人信息
    inviteCode: {
        type: String,
        default: null
    },
    invitedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // 用户状态
    status: {
        type: Number,
        default: 1 // 1: 正常, 0: 禁用
    },
    // 是否是配送员
    isDelivery: {
        type: Boolean,
        default: false
    },
    // 是否是接单员
    isReceiver: {
        type: Boolean,
        default: false
    },
    // 是否完善了用户信息
    isProfileComplete: {
        type: Boolean,
        default: false
    },
    // 最后登录时间
    lastLoginTime: {
        type: Date,
        default: Date.now
    },
    // 创建时间
    createTime: {
        type: Date,
        default: Date.now
    },
    // 更新时间
    updateTime: {
        type: Date,
        default: Date.now
    }
});

// 更新时间中间件
userSchema.pre('save', function(next) {
    this.updateTime = Date.now();
    next();
});

module.exports = User = mongoose.model("WxUser", userSchema);
