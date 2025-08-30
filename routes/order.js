var express = require('express');
var router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const Shop = require("../models/Shop");
const Goods = require("../models/Goods");
var vertoken = require('../utils/token');

/**
 * 创建订单接口
 * POST /api/order/create
 * 
 * 请求参数:
 * - shopId: 店铺ID
 * - shopName: 店铺名称
 * - orderItems: 订单商品列表
 * - deliveryAddress: 配送地址信息
 * - deliveryType: 配送类型 (0-立即送达，1-预约配送)
 * - deliveryTime: 配送时间 (预约配送时必填)
 * - goodsAmount: 商品金额
 * - deliveryFee: 配送费
 * - couponAmount: 优惠券抵扣金额
 * - totalAmount: 订单总金额
 * - remark: 订单备注
 * - orderTime: 下单时间
 */
router.post('/create', async (req, res) => {
  try {
    const {
      shopId,
      shopName,
      orderItems,
      deliveryAddress,
      deliveryType,
      deliveryTime,
      goodsAmount,
      deliveryFee,
      couponAmount,
      totalAmount,
      remark,
      orderTime
    } = req.body;
    
    // 参数验证
    if (!shopId || !shopName || !orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.json({
        code: -1,
        message: '订单参数不完整：缺少店铺信息或商品信息'
      });
    }
    
    if (!deliveryAddress || !deliveryAddress.name || !deliveryAddress.phone || !deliveryAddress.address) {
      return res.json({
        code: -1,
        message: '配送地址信息不完整'
      });
    }
    
    if (typeof goodsAmount !== 'number' || typeof totalAmount !== 'number' || totalAmount <= 0) {
      return res.json({
        code: -1,
        message: '订单金额信息不正确'
      });
    }
    
    if (deliveryType === 1 && !deliveryTime) {
      return res.json({
        code: -1,
        message: '预约配送必须指定配送时间'
      });
    }
    
    // 验证商品信息
    for (let item of orderItems) {
      if (!item.goodsId || !item.goodsName || typeof item.price !== 'number' || 
          typeof item.quantity !== 'number' || item.quantity <= 0 || 
          typeof item.subtotal !== 'number') {
        return res.json({
          code: -1,
          message: '商品信息不完整或格式错误'
        });
      }
      
      // 验证小计金额
      if (Math.abs(item.subtotal - (item.price * item.quantity)) > 0.01) {
        return res.json({
          code: -1,
          message: `商品 ${item.goodsName} 的小计金额计算错误`
        });
      }
    }
    
    // 验证总金额计算
    const calculatedGoodsAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const calculatedTotal = calculatedGoodsAmount + (deliveryFee || 0) - (couponAmount || 0);
    
    if (Math.abs(calculatedGoodsAmount - goodsAmount) > 0.01) {
      return res.json({
        code: -1,
        message: '商品金额计算错误'
      });
    }
    
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return res.json({
        code: -1,
        message: '订单总金额计算错误'
      });
    }
    
    // 从token中获取用户ID
    const token = req.headers.authorization;
    if (!token) {
      return res.json({
        code: -1,
        message: '请先登录'
      });
    }
    
    let userId;
    try {
      const decoded = await vertoken.getToken(token);
      userId = decoded._id;
    } catch (error) {
      return res.json({
        code: -1,
        message: 'token无效，请重新登录'
      });
    }
    
    // 生成订单编号
    const orderNumber = Order.generateOrderNumber();
    
    // 创建订单对象
    const newOrder = new Order({
      orderNumber,
      userId,
      shopId,
      shopName,
      orderItems,
      deliveryAddress,
      deliveryType: deliveryType || 0,
      deliveryTime: deliveryType === 1 ? new Date(deliveryTime) : null,
      goodsAmount,
      deliveryFee: deliveryFee || 0,
      couponAmount: couponAmount || 0,
      totalAmount,
      remark: remark || '',
      orderTime: orderTime ? new Date(orderTime) : new Date(),
      status: 'pending',
      paymentStatus: 'unpaid'
    });
    
    // 保存订单到数据库
    const savedOrder = await newOrder.save();
    
    res.json({
      code: 200,
      message: '订单创建成功',
      data: {
        orderId: savedOrder._id,
        orderNumber: savedOrder.orderNumber,
        totalAmount: savedOrder.totalAmount,
        status: savedOrder.status,
        paymentStatus: savedOrder.paymentStatus,
        createTime: savedOrder.createTime
      }
    });
    
  } catch (error) {
    console.error('创建订单失败:', error);
    res.json({
      code: -1,
      message: '创建订单失败: ' + error.message
    });
  }
});

/**
 * 获取订单详情接口
 * POST /api/order/detail
 * 
 * 请求参数:
 * - orderId: 订单ID
 */
router.post('/detail', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.json({
        code: -1,
        message: '订单ID不能为空'
      });
    }
    
    // 从token中获取用户ID
    const token = req.headers.authorization;
    if (!token) {
      return res.json({
        code: -1,
        message: '请先登录'
      });
    }
    
    let userId;
    try {
      const decoded = await vertoken.getToken(token);
      userId = decoded._id;
    } catch (error) {
      return res.json({
        code: -1,
        message: 'token无效，请重新登录'
      });
    }
    
    const order = await Order.findById(orderId)
      .populate('userId', 'nickname phone avatar')
      .populate('shopId', 'shopName address contactPhone logo')
      .populate('deliveryUserId', 'nickname phone avatar');
    
    if (!order) {
      return res.json({
        code: -1,
        message: '订单不存在'
      });
    }
    
    // 验证订单所有权
    if (order.userId._id.toString() !== userId) {
      return res.json({
        code: -1,
        message: '无权限查看此订单'
      });
    }
    
    res.json({
      code: 200,
      message: '获取订单详情成功',
      data: order
    });
    
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.json({
      code: -1,
      message: '获取订单详情失败: ' + error.message
    });
  }
});

/**
 * 获取用户订单列表接口
 * POST /api/order/list
 * 
 * 请求参数:
 * - status: 订单状态 (可选)
 * - page: 页码 (默认1)
 * - limit: 每页数量 (默认10)
 */
router.post('/list', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.body;
    
    // 从token中获取用户ID
    const token = req.headers.authorization;
    if (!token) {
      return res.json({
        code: -1,
        message: '请先登录'
      });
    }
    
    let userId;
    try {
      const decoded = await vertoken.getToken(token);
      userId = decoded._id;
    } catch (error) {
      return res.json({
        code: -1,
        message: 'token无效，请重新登录'
      });
    }
    
    const query = { userId };
    if (status) {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const orders = await Order.find(query)
      .populate('shopId', 'name address phone')
      .sort({ createTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Order.countDocuments(query);
    
    res.json({
      code: 0,
      message: '获取订单列表成功',
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.json({
      code: -1,
      message: '获取订单列表失败: ' + error.message
    });
  }
});

/**
 * 取消订单接口
 * POST /api/order/cancel
 * 
 * 请求参数:
 * - orderId: 订单ID
 * - cancelReason: 取消原因
 */
router.post('/cancel', async (req, res) => {
  try {
    const { orderId, cancelReason } = req.body;
    
    if (!orderId) {
      return res.json({
        code: -1,
        message: '订单ID不能为空'
      });
    }
    
    // 从token中获取用户ID
    const token = req.headers.authorization;
    if (!token) {
      return res.json({
        code: -1,
        message: '请先登录'
      });
    }
    
    let userId;
    try {
      const decoded = await vertoken.getToken(token);
      userId = decoded._id;
    } catch (error) {
      return res.json({
        code: -1,
        message: 'token无效，请重新登录'
      });
    }
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.json({
        code: -1,
        message: '订单不存在'
      });
    }
    
    // 验证订单所有权
    if (order.userId.toString() !== userId) {
      return res.json({
        code: -1,
        message: '无权限操作此订单'
      });
    }
    
    // 检查订单状态是否可以取消
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.json({
        code: -1,
        message: '当前订单状态不允许取消'
      });
    }
    
    // 更新订单状态
    order.status = 'cancelled';
    order.cancelReason = cancelReason || '用户取消';
    order.cancelledTime = new Date();
    
    await order.save();
    
    res.json({
      code: 0,
      message: '订单取消成功',
      data: {
        orderId: order._id,
        status: order.status,
        cancelledTime: order.cancelledTime
      }
    });
    
  } catch (error) {
    console.error('取消订单失败:', error);
    res.json({
      code: -1,
      message: '取消订单失败: ' + error.message
    });
  }
});

/**
 * 更新订单状态接口 (商家/配送员使用)
 * POST /api/order/update-status
 * 
 * 请求参数:
 * - orderId: 订单ID
 * - status: 新状态
 */
router.post('/update-status', async (req, res) => {
  try {
    const { orderId, status } = req.body;
    
    if (!orderId || !status) {
      return res.json({
        code: -1,
        message: '订单ID和状态不能为空'
      });
    }
    
    const validStatuses = ['pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.json({
        code: -1,
        message: '无效的订单状态'
      });
    }
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.json({
        code: -1,
        message: '订单不存在'
      });
    }
    
    // 更新订单状态和相应的时间字段
    order.status = status;
    
    switch (status) {
      case 'confirmed':
        order.confirmTime = new Date();
        break;
      case 'delivering':
        order.deliveryStartTime = new Date();
        break;
      case 'completed':
        order.completedTime = new Date();
        break;
      case 'cancelled':
        order.cancelledTime = new Date();
        break;
    }
    
    await order.save();
    
    res.json({
      code: 0,
      message: '订单状态更新成功',
      data: {
        orderId: order._id,
        status: order.status,
        updateTime: order.updateTime
      }
    });
    
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.json({
      code: -1,
      message: '更新订单状态失败: ' + error.message
    });
  }
});

module.exports = router;