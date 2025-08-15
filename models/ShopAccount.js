const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// 商家账号模型
const shopAccountSchema = new Schema({
  // 账号信息
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // 商家信息
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: "https://example.com/default-avatar.png"
  },
  // 关联店铺
  shop: {
    type: Schema.Types.ObjectId,
    ref: "Shop"
  },
  // 账号状态
  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "pending"
  },
  // 权限级别
  role: {
    type: String,
    enum: ["owner", "manager", "staff"],
    default: "owner"
  },
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 最后登录时间
  lastLoginAt: {
    type: Date
  }
});

// 创建索引
shopAccountSchema.index({ username: 1 });
shopAccountSchema.index({ email: 1 });
shopAccountSchema.index({ phone: 1 });

module.exports = ShopAccount = mongoose.model("ShopAccount", shopAccountSchema);
