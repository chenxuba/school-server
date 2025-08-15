const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 商品模型
const GoodsSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true
  },
  originalPrice: {
    type: Number,
    default: 0
  },
  images: [{
    type: String
  }],
  thumbnail: {
    type: String,
    default: ''
  },
  stock: {
    type: Number,
    default: 0
  },
  sales: {
    type: Number,
    default: 0
  },
  status: {
    type: Number,
    default: 1,  // 1: 上架, 0: 下架
  },
  menuId: {
    type: Schema.Types.ObjectId,
    ref: 'goodsMenu',
    required: true
  },
  shopId: {
    type: Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },

  isRecommend: {
    type: Boolean,
    default: false
  },
  createTime: {
    type: Date,
    default: Date.now
  },
  updateTime: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('goods', GoodsSchema);
