const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//校区模型
const campusSchema = new Schema({
  // 校区基本信息
  campusName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  // 地理位置信息
  address: {
    type: String,
    required: true,
  },
  // 经纬度
  location: {
    longitude: {
      type: Number,
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
  },
  // 校区状态 1: 启用, 2: 禁用
  status: {
    type: String,
    enum: ["1", "2"],
    default: "1",
  },
  // 联系信息
  contactPhone: {
    type: String,
    default: "",
  },
  contactEmail: {
    type: String,
    default: "",
  },
  // 管理员
  manager: {
    type: String,
    default: "",
  },
  // 创建时间
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Campus = mongoose.model("Campus", campusSchema);
