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
    const currentTime = new Date();
    const paymentExpireTime = new Date(currentTime.getTime() + 15 * 60 * 1000); // 15分钟后过期
    
    // 调试信息 - 时区对比
    console.log('=== 订单时间信息 ===');
    console.log('创建时间(UTC):', currentTime.toISOString());
    console.log('创建时间(本地):', currentTime.toLocaleString('zh-CN'));
    console.log('过期时间(UTC):', paymentExpireTime.toISOString());
    console.log('过期时间(本地):', paymentExpireTime.toLocaleString('zh-CN'));
    console.log('过期间隔:', (paymentExpireTime - currentTime) / (1000 * 60), '分钟');
    console.log('==================');
    
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
      orderTime: orderTime ? new Date(orderTime) : currentTime,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentExpireTime: paymentExpireTime
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
        createTime: savedOrder.createTime,
        paymentExpireTime: savedOrder.paymentExpireTime
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

// ==================== 商家后台订单管理接口 ====================

/**
 * 商家获取订单列表接口
 * POST /api/order/shop/orders
 * 
 * 请求参数:
 * - status: 订单状态 (可选)
 * - page: 页码 (默认1)
 * - limit: 每页数量 (默认10)
 * - startDate: 开始日期 (可选)
 * - endDate: 结束日期 (可选)
 * - orderNumber: 订单号搜索 (可选)
 */
router.post('/shop/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 10, startDate, endDate, orderNumber } = req.body;
    
    // 从token中获取商家信息
    const token = req.headers.authorization;
    if (!token) {
      return res.json({
        code: -1,
        message: '请先登录'
      });
    }
    
    let shopOwnerId;
    try {
      const decoded = await vertoken.getToken(token);
      shopOwnerId = decoded._id;
    } catch (error) {
      return res.json({
        code: -1,
        message: 'token无效，请重新登录'
      });
    }
    
    // 查找商家拥有的店铺
    const shop = await Shop.findOne({ owner: shopOwnerId });
    if (!shop) {
      return res.json({
        code: -1,
        message: '未找到关联的店铺信息'
      });
    }
    
    // 构建查询条件
    const query = { shopId: shop._id };
    
    if (status) {
      query.status = status;
    }
    
    if (orderNumber) {
      query.orderNumber = { $regex: orderNumber, $options: 'i' };
    }
    
    if (startDate || endDate) {
      query.createTime = {};
      if (startDate) {
        query.createTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createTime.$lte = new Date(endDate);
      }
    }
    
    const skip = (page - 1) * limit;
    
    const orders = await Order.find(query)
      .populate('userId', 'nickname phone avatar')
      .populate('deliveryUserId', 'nickname phone avatar')
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
    console.error('商家获取订单列表失败:', error);
    res.json({
      code: -1,
      message: '获取订单列表失败: ' + error.message
    });
  }
});

/**
 * 商家获取订单详情接口
 * POST /api/order/shop/detail
 * 
 * 请求参数:
 * - orderId: 订单ID
 */
router.post('/shop/detail', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.json({
        code: -1,
        message: '订单ID不能为空'
      });
    }
    
    // 从token中获取商家信息
    const token = req.headers.authorization;
    if (!token) {
      return res.json({
        code: -1,
        message: '请先登录'
      });
    }
    
    let shopOwnerId;
    try {
      const decoded = await vertoken.getToken(token);
      shopOwnerId = decoded._id;
    } catch (error) {
      return res.json({
        code: -1,
        message: 'token无效，请重新登录'
      });
    }
    
    // 查找商家拥有的店铺
    const shop = await Shop.findOne({ owner: shopOwnerId });
    if (!shop) {
      return res.json({
        code: -1,
        message: '未找到关联的店铺信息'
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
    
    // 验证订单是否属于该商家
    if (order.shopId._id.toString() !== shop._id.toString()) {
      return res.json({
        code: -1,
        message: '无权限查看此订单'
      });
    }
    
    res.json({
      code: 0,
      message: '获取订单详情成功',
      data: order
    });
    
  } catch (error) {
    console.error('商家获取订单详情失败:', error);
    res.json({
      code: -1,
      message: '获取订单详情失败: ' + error.message
    });
  }
});

/**
 * 商家更新订单状态接口
 * POST /api/order/shop/update-status
 * 
 * 请求参数:
 * - orderId: 订单ID
 * - status: 新状态 (confirmed, preparing, delivering, completed, cancelled)
 * - cancelReason: 取消原因 (状态为cancelled时必填)
 */
router.post('/shop/update-status', async (req, res) => {
  try {
    const { orderId, status, cancelReason } = req.body;
    
    if (!orderId || !status) {
      return res.json({
        code: -1,
        message: '订单ID和状态不能为空'
      });
    }
    
    const validStatuses = ['confirmed', 'preparing', 'delivering', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.json({
        code: -1,
        message: '无效的订单状态'
      });
    }
    
    if (status === 'cancelled' && !cancelReason) {
      return res.json({
        code: -1,
        message: '取消订单时必须提供取消原因'
      });
    }
    
    // 从token中获取商家信息
    const token = req.headers.authorization;
    if (!token) {
      return res.json({
        code: -1,
        message: '请先登录'
      });
    }
    
    let shopOwnerId;
    try {
      const decoded = await vertoken.getToken(token);
      shopOwnerId = decoded._id;
    } catch (error) {
      return res.json({
        code: -1,
        message: 'token无效，请重新登录'
      });
    }
    
    // 查找商家拥有的店铺
    const shop = await Shop.findOne({ owner: shopOwnerId });
    if (!shop) {
      return res.json({
        code: -1,
        message: '未找到关联的店铺信息'
      });
    }
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.json({
        code: -1,
        message: '订单不存在'
      });
    }
    
    // 验证订单是否属于该商家
    if (order.shopId.toString() !== shop._id.toString()) {
      return res.json({
        code: -1,
        message: '无权限操作此订单'
      });
    }
    
    // 检查状态转换是否合法
    const statusTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['delivering', 'cancelled'],
      'delivering': ['completed'],
      'completed': [],
      'cancelled': []
    };
    
    if (!statusTransitions[order.status].includes(status)) {
      return res.json({
        code: -1,
        message: `订单状态不能从 ${order.status} 直接变更为 ${status}`
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
        order.cancelReason = cancelReason;
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
    console.error('商家更新订单状态失败:', error);
    res.json({
      code: -1,
      message: '更新订单状态失败: ' + error.message
    });
  }
});



/**
 * 商家批量处理订单接口
 * POST /api/order/shop/batch-update
 * 
 * 请求参数:
 * - orderIds: 订单ID数组
 * - action: 操作类型 (confirm-确认, cancel-取消, prepare-开始制作)
 * - cancelReason: 取消原因 (action为cancel时必填)
 */
router.post('/shop/batch-update', async (req, res) => {
  try {
    const { orderIds, action, cancelReason } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.json({
        code: -1,
        message: '订单ID列表不能为空'
      });
    }
    
    if (!action) {
      return res.json({
        code: -1,
        message: '操作类型不能为空'
      });
    }
    
    const validActions = ['confirm', 'cancel', 'prepare'];
    if (!validActions.includes(action)) {
      return res.json({
        code: -1,
        message: '无效的操作类型'
      });
    }
    
    if (action === 'cancel' && !cancelReason) {
      return res.json({
        code: -1,
        message: '批量取消订单时必须提供取消原因'
      });
    }
    
    // 从token中获取商家信息
    const token = req.headers.authorization;
    if (!token) {
      return res.json({
        code: -1,
        message: '请先登录'
      });
    }
    
    let shopOwnerId;
    try {
      const decoded = await vertoken.getToken(token);
      shopOwnerId = decoded._id;
    } catch (error) {
      return res.json({
        code: -1,
        message: 'token无效，请重新登录'
      });
    }
    
    // 查找商家拥有的店铺
    const shop = await Shop.findOne({ owner: shopOwnerId });
    if (!shop) {
      return res.json({
        code: -1,
        message: '未找到关联的店铺信息'
      });
    }
    
    // 查找所有相关订单
    const orders = await Order.find({
      _id: { $in: orderIds },
      shopId: shop._id
    });
    
    if (orders.length === 0) {
      return res.json({
        code: -1,
        message: '未找到可操作的订单'
      });
    }
    
    // 检查订单权限
    if (orders.length !== orderIds.length) {
      return res.json({
        code: -1,
        message: '部分订单不存在或无权限操作'
      });
    }
    
    const results = {
      success: [],
      failed: []
    };
    
    // 批量处理订单
    for (const order of orders) {
      try {
        let newStatus;
        let canUpdate = false;
        
        switch (action) {
          case 'confirm':
            if (order.status === 'pending') {
              newStatus = 'confirmed';
              order.confirmTime = new Date();
              canUpdate = true;
            }
            break;
          case 'cancel':
            if (['pending', 'confirmed', 'preparing'].includes(order.status)) {
              newStatus = 'cancelled';
              order.cancelledTime = new Date();
              order.cancelReason = cancelReason;
              canUpdate = true;
            }
            break;
          case 'prepare':
            if (order.status === 'confirmed') {
              newStatus = 'preparing';
              canUpdate = true;
            }
            break;
        }
        
        if (canUpdate) {
          order.status = newStatus;
          await order.save();
          results.success.push({
            orderId: order._id,
            orderNumber: order.orderNumber,
            newStatus
          });
        } else {
          results.failed.push({
            orderId: order._id,
            orderNumber: order.orderNumber,
            reason: `订单状态 ${order.status} 不允许执行 ${action} 操作`
          });
        }
      } catch (error) {
        results.failed.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          reason: error.message
        });
      }
    }
    
    res.json({
      code: 0,
      message: '批量处理完成',
      data: {
        total: orderIds.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        results
      }
    });
    
  } catch (error) {
    console.error('批量处理订单失败:', error);
    res.json({
      code: -1,
      message: '批量处理订单失败: ' + error.message
    });
  }
});

/**
 * 订单支付接口
 * POST /api/order/pay
 * 
 * 请求参数:
 * - orderId: 订单ID
 * - paymentMethod: 支付方式 ('wechat' | 'balance')
 * - amount: 支付金额
 */
router.post('/pay', async (req, res) => {
  try {
    const { orderId, paymentMethod, amount } = req.body;
    
    // 参数验证
    if (!orderId || !paymentMethod || !amount) {
      return res.json({
        code: -1,
        message: '支付参数不完整'
      });
    }
    
    // 查找订单
    const order = await Order.findById(orderId);
    if (!order) {
      return res.json({
        code: -1,
        message: '订单不存在'
      });
    }
    
    // 检查订单状态和支付状态
    if (order.paymentStatus === 'paid') {
      return res.json({
        code: -1,
        message: '订单已支付，无需重复支付',
        orderStatus: order.status,
        paymentStatus: order.paymentStatus
      });
    }
    
    if (order.status !== 'pending') {
      let statusMessage = '订单状态不允许支付';
      if (order.status === 'confirmed') {
        statusMessage = '订单已确认，无需重复支付';
      } else if (order.status === 'cancelled') {
        statusMessage = '订单已取消，无法支付';
      } else if (order.status === 'completed') {
        statusMessage = '订单已完成，无法支付';
      }
      
      return res.json({
        code: -1,
        message: statusMessage,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus
      });
    }
    
    // 检查支付金额
    if (parseFloat(amount) !== parseFloat(order.totalAmount)) {
      return res.json({
        code: -1,
        message: '支付金额与订单金额不符'
      });
    }
    
    // 根据支付方式处理
    if (paymentMethod === 'wechat') {
      // 微信支付处理
      const wechatPayResult = await processWechatPayment({
        orderId,
        amount,
        orderNumber: order.orderNumber
      });
      
      if (wechatPayResult.success) {
        // 更新订单状态：支付成功后，支付状态变为已支付，订单状态变为待确认
        await Order.findByIdAndUpdate(orderId, {
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'wechat',
          paymentTime: new Date(),
          paymentTransactionId: wechatPayResult.transactionId
        });
        
        return res.json({
          code: 200,
          message: '支付成功',
          success: true,
          data: {
            orderId,
            paymentMethod: 'wechat',
            transactionId: wechatPayResult.transactionId
          }
        });
      } else {
        return res.json({
          code: -1,
          message: wechatPayResult.message || '微信支付失败',
          success: false
        });
      }
    } else if (paymentMethod === 'balance') {
      // 余额支付处理
      const balancePayResult = await processBalancePayment({
        orderId,
        amount,
        userId: order.userId
      });
      
      if (balancePayResult.success) {
        // 更新订单状态：支付成功后，支付状态变为已支付，订单状态变为待确认
        await Order.findByIdAndUpdate(orderId, {
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'balance',
          paymentTime: new Date()
        });
        
        return res.json({
          code: 200,
          message: '支付成功',
          success: true,
          data: {
            orderId,
            paymentMethod: 'balance'
          }
        });
      } else {
        return res.json({
          code: -1,
          message: balancePayResult.message || '余额支付失败',
          success: false
        });
      }
    } else {
      return res.json({
        code: -1,
        message: '不支持的支付方式'
      });
    }
    
  } catch (error) {
    console.error('订单支付失败:', error);
    res.json({
      code: -1,
      message: '支付处理失败: ' + error.message,
      success: false
    });
  }
});

/**
 * 微信支付处理函数
 * @param {Object} params - 支付参数
 * @param {string} params.orderId - 订单ID
 * @param {number} params.amount - 支付金额
 * @param {string} params.orderNumber - 订单号
 * @returns {Promise<Object>} 支付结果
 */
async function processWechatPayment({ orderId, amount, orderNumber }) {
  try {
    // TODO: 集成微信支付SDK
    // 以下是微信支付需要的参数，请根据实际情况配置：
    
    const wechatConfig = {
      // 微信支付商户号 - 在微信商户平台获取
      mchId: 'YOUR_MERCHANT_ID',
      
      // 微信支付API密钥 - 在微信商户平台设置
      apiKey: 'YOUR_API_KEY',
      
      // 微信支付证书路径 - 从微信商户平台下载
      certPath: 'path/to/apiclient_cert.pem',
      keyPath: 'path/to/apiclient_key.pem',
      
      // 微信支付回调地址 - 支付成功后微信会调用此接口
      notifyUrl: 'https://your-domain.com/api/order/wechat-notify',
      
      // 微信小程序AppID - 在微信公众平台获取
      appId: 'YOUR_WECHAT_APPID'
    };
    
    // 构建微信支付参数
    const paymentParams = {
      appid: wechatConfig.appId,
      mch_id: wechatConfig.mchId,
      nonce_str: generateNonceStr(), // 随机字符串
      body: `校园外卖订单-${orderNumber}`, // 商品描述
      out_trade_no: orderNumber, // 商户订单号
      total_fee: Math.round(amount * 100), // 金额，单位为分
      spbill_create_ip: '127.0.0.1', // 终端IP
      notify_url: wechatConfig.notifyUrl,
      trade_type: 'JSAPI', // 小程序支付
      openid: 'USER_OPENID' // 用户openid，需要从前端传递或从数据库获取
    };
    
    // TODO: 实现微信支付统一下单接口调用
    // 1. 生成签名
    // 2. 调用微信统一下单接口
    // 3. 解析返回结果
    // 4. 生成小程序支付参数
    
    // 模拟支付成功（实际开发中需要调用真实的微信支付接口）
    console.log('微信支付参数:', paymentParams);
    
    // 这里应该调用微信支付API
    // const wechatResponse = await callWechatPayAPI(paymentParams);
    
    // 模拟返回成功结果
    return {
      success: true,
      transactionId: 'wx' + Date.now(), // 微信交易号
      prepayId: 'prepay_id_' + Date.now(), // 预支付交易会话标识
      paySign: 'generated_pay_sign' // 支付签名
    };
    
  } catch (error) {
    console.error('微信支付处理失败:', error);
    return {
      success: false,
      message: '微信支付处理失败: ' + error.message
    };
  }
}

/**
 * 余额支付处理函数
 * @param {Object} params - 支付参数
 * @param {string} params.orderId - 订单ID
 * @param {number} params.amount - 支付金额
 * @param {string} params.userId - 用户ID
 * @returns {Promise<Object>} 支付结果
 */
async function processBalancePayment({ orderId, amount, userId }) {
  try {
    // 查询用户余额
    const user = await User.findById(userId);
    if (!user) {
      return {
        success: false,
        message: '用户不存在'
      };
    }
    
    const userBalance = parseFloat(user.balance || 0);
    const paymentAmount = parseFloat(amount);
    
    // 检查余额是否足够
    if (userBalance < paymentAmount) {
      return {
        success: false,
        message: '余额不足'
      };
    }
    
    // 扣除用户余额
    const newBalance = userBalance - paymentAmount;
    await User.findByIdAndUpdate(userId, {
      balance: newBalance.toFixed(2)
    });
    
    return {
      success: true,
      remainingBalance: newBalance.toFixed(2)
    };
    
  } catch (error) {
    console.error('余额支付处理失败:', error);
    return {
      success: false,
      message: '余额支付处理失败: ' + error.message
    };
  }
}

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 微信支付回调接口
 * POST /api/order/wechat-notify
 * 微信支付成功后会调用此接口
 */
router.post('/wechat-notify', async (req, res) => {
  try {
    // TODO: 处理微信支付回调
    // 1. 验证回调数据的签名
    // 2. 更新订单状态
    // 3. 返回成功响应给微信
    
    console.log('微信支付回调数据:', req.body);
    
    // 返回成功响应给微信
    res.set('Content-Type', 'text/xml');
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
    
  } catch (error) {
    console.error('微信支付回调处理失败:', error);
    res.set('Content-Type', 'text/xml');
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>');
  }
});

module.exports = router;