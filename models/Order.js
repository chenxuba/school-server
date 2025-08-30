const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// 订单商品项模型
const orderItemSchema = new Schema({
    goodsId: {
        type: Schema.Types.ObjectId,
        ref: 'Goods',
        required: true
    },
    goodsName: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    specs: {
        type: String,
        default: ''
    },
    image: {
        type: String,
        default: ''
    },
    subtotal: {
        type: Number,
        required: true
    }
});

// 配送地址模型
const deliveryAddressSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    latitude: {
        type: Number,
        default: 0
    },
    longitude: {
        type: Number,
        default: 0
    }
});

// 订单主模型
const orderSchema = new Schema({
    // 订单编号
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    
    // 用户信息
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'WxUser',
        required: true
    },
    
    // 店铺信息
    shopId: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    shopName: {
        type: String,
        required: true
    },
    
    // 订单商品列表
    orderItems: [orderItemSchema],
    
    // 配送地址信息
    deliveryAddress: {
        type: deliveryAddressSchema,
        required: true
    },
    
    // 配送类型和时间
    deliveryType: {
        type: Number,
        required: true,
        enum: [0, 1], // 0-立即送达，1-预约配送
        default: 0
    },
    deliveryTime: {
        type: Date,
        default: null
    },
    
    // 费用信息
    goodsAmount: {
        type: Number,
        required: true,
        min: 0
    },
    deliveryFee: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    couponAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    
    // 订单状态
    status: {
        type: String,
        required: true,
        enum: ['pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'],
        default: 'pending'
    },
    
    // 支付状态
    paymentStatus: {
        type: String,
        required: true,
        enum: ['unpaid', 'paid', 'refunded'],
        default: 'unpaid'
    },
    
    // 支付方式（支付时设置）
    paymentMethod: {
        type: String,
        enum: ['wechat', 'alipay', 'cash']
    },
    
    // 其他信息
    remark: {
        type: String,
        default: ''
    },
    
    // 配送员信息
    deliveryUserId: {
        type: Schema.Types.ObjectId,
        ref: 'WxUser',
        default: null
    },
    
    // 时间信息
    orderTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    confirmTime: {
        type: Date,
        default: null
    },
    deliveryStartTime: {
        type: Date,
        default: null
    },
    completedTime: {
        type: Date,
        default: null
    },
    cancelledTime: {
        type: Date,
        default: null
    },
    
    // 取消原因
    cancelReason: {
        type: String,
        default: ''
    },

    // 支付超时时间
    paymentExpireTime: {
        type: Date,
        default: null
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

// 生成订单编号的方法
orderSchema.statics.generateOrderNumber = function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `ORD${year}${month}${day}${hour}${minute}${second}${random}`;
};

// 更新时间中间件
orderSchema.pre('save', function(next) {
    this.updateTime = new Date();
    next();
});

module.exports = Order = mongoose.model("Order", orderSchema);