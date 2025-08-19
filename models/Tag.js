const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//标签模型
const tagSchema = new Schema({
  // 标签名称
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  // 标签描述
  description: {
    type: String,
    default: "",
  },
  // 标签颜色（用于前端显示）
  color: {
    type: String,
    default: "#1890ff",
  },
  // 标签状态
  status: {
    type: String,
    enum: ["1", "0"], // 1-启用，0-禁用
    default: "1",
  },
  // 排序权重
  sort: {
    type: Number,
    default: 0,
  },
  // 创建时间
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Tag = mongoose.model("Tag", tagSchema);
