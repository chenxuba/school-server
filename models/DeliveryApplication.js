const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// 配送员/接单员申请模型
const deliveryApplicationSchema = new Schema({
    // 关联用户
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'WxUser',
        required: true
    },
    // 申请类型：delivery-配送员, receiver-接单员
    applicationType: {
        type: String,
        required: true,
        enum: ['delivery', 'receiver']
    },
    // 姓名
    realName: {
        type: String,
        required: true,
        trim: true
    },
    // 身份证号
    idNumber: {
        type: String,
        required: true,
        trim: true
    },
    // 学号
    studentNumber: {
        type: String,
        required: true,
        trim: true
    },
    // 手机号
    phone: {
        type: String,
        required: true,
        trim: true
    },
    // 身份证正面照片URL
    idCardFrontUrl: {
        type: String,
        required: true
    },
    // 身份证反面照片URL
    idCardBackUrl: {
        type: String,
        required: true
    },
    // 申请状态：pending-待审核, approved-已通过, rejected-已拒绝
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'approved', 'rejected']
    },
    // 审核意见
    reviewComment: {
        type: String,
        default: ''
    },
    // 审核人
    reviewerId: {
        type: Schema.Types.ObjectId,
        ref: 'AdminUser',
        default: null
    },
    // 审核时间
    reviewTime: {
        type: Date,
        default: null
    },
    // 申请时间
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

// 创建复合索引，确保同一用户同一类型只能有一个待审核的申请
deliveryApplicationSchema.index(
    { userId: 1, applicationType: 1, status: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { status: 'pending' },
        name: 'unique_pending_application'
    }
);

// 更新时间中间件
deliveryApplicationSchema.pre('save', function(next) {
    this.updateTime = Date.now();
    next();
});

module.exports = DeliveryApplication = mongoose.model("DeliveryApplication", deliveryApplicationSchema);
