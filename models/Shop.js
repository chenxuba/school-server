const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//店铺模型
const shopSchema = new Schema({
  // 店铺详细信息
  shopName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  logo: {
    type: String,
    default: "",
  },
  banners: [
    {
      type: String,
    },
  ],
  // 营业信息
  businessLicense: {
    type: String,
    default: "",
  },
  businessHours: {
    open: {
      type: String,
      default: "09:00",
    },
    close: {
      type: String,
      default: "21:00",
    },
  },
  businessStatus: {
    type: String,
    enum: ["1", "2"],
    default: "1",
  },
  // 位置信息
  address: {
    type: String,
  },
  // 经纬度
  location: {
    longitude: {
      type: Number,
    },
    latitude: {
      type: Number,
    },
  },
  // 关联校区
  campus: {
    type: Schema.Types.ObjectId,
    ref: "Campus",
    required: true,
  },
  // 联系方式
  contactPhone: {
    type: String,
  },
  contactWechat: {
    type: String,
  },
  // 关联商家账号
  owner: {
    type: Schema.Types.ObjectId,
    ref: "ShopAccount"
  },
  // 是否推荐
  isRecommended: {
    type: Boolean,
    default: false,
  },
  // 标签
  tags: [{
    type: String,
  }],
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Shop = mongoose.model("Shop", shopSchema);
