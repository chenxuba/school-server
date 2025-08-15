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
  // 单点不送标记
  noSingleDelivery: {
    type: Boolean,
    default: false
  },
  // 多规格信息
  specifications: [{
    name: {
      type: String,
      required: true  // 规格名称，如：颜色、尺寸、口味等
    },
    values: [{
      type: String,
      required: true
    }]  // 规格值数组，如：['红色', '蓝色', '白色'] 或 ['S', 'M', 'L', 'XL']
  }],
  createTime: {
    type: Date,
    default: Date.now
  },
  updateTime: {
    type: Date,
    default: Date.now
  },
  // 软删除字段
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('goods', GoodsSchema);
