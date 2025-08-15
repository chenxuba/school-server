const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 商品分类模型
const GoodsMenuSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'goodsMenu',
    default: null
  },
  level: {
    type: Number,
    default: 1
  },
  sort: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  shopId: {
    type: Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
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

module.exports = mongoose.model('goodsMenu', GoodsMenuSchema);
