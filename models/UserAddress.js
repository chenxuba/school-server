const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// 用户地址模型
const userAddressSchema = new Schema({
    // 关联用户ID
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'WxUser',
        required: true
    },
    // 收货人姓名
    receiverName: {
        type: String,
        required: true,
        trim: true
    },
    // 收货人手机号
    receiverPhone: {
        type: String,
        required: true,
        trim: true
    },
    // 详细地址
    address: {
        type: String,
        required: true,
        trim: true
    },
    // 省份
    province: {
        type: String,
        default: '',
        trim: true
    },
    // 城市
    city: {
        type: String,
        default: '',
        trim: true
    },
    // 区县
    district: {
        type: String,
        default: '',
        trim: true
    },
    // 门牌号/详细地址
    detailAddress: {
        type: String,
        default: '',
        trim: true
    },
    // 是否为默认地址
    isDefault: {
        type: Boolean,
        default: false
    },
    // 地址状态（1: 正常, 0: 删除）
    status: {
        type: Number,
        default: 1
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

// 创建复合索引
userAddressSchema.index({ userId: 1, status: 1 });
userAddressSchema.index({ userId: 1, isDefault: 1 });

// 保存前更新时间
userAddressSchema.pre('save', function(next) {
    this.updateTime = new Date();
    next();
});

// 确保每个用户只有一个默认地址
userAddressSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        // 如果设置为默认地址，将该用户的其他地址设为非默认
        await this.constructor.updateMany(
            { 
                userId: this.userId, 
                _id: { $ne: this._id },
                status: 1
            },
            { isDefault: false }
        );
    }
    next();
});

module.exports = mongoose.model("UserAddress", userAddressSchema);