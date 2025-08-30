const Order = require('../models/Order');

/**
 * 订单定时任务管理器
 * 负责检查和自动取消超时未支付的订单
 */
class OrderScheduler {
  constructor() {
    this.intervalId = null;
    this.checkInterval = 60 * 1000; // 每分钟检查一次
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.intervalId) {
      console.log('订单定时任务已在运行中');
      return;
    }

    console.log('启动订单定时任务，检查间隔:', this.checkInterval / 1000, '秒');
    
    // 立即执行一次
    this.checkExpiredOrders();
    
    // 设置定时任务
    this.intervalId = setInterval(() => {
      this.checkExpiredOrders();
    }, this.checkInterval);
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('订单定时任务已停止');
    }
  }

  /**
   * 检查并取消超时未支付的订单
   */
  async checkExpiredOrders() {
    try {
      const currentTime = new Date();
      
      // 查找所有超时未支付的订单
      const expiredOrders = await Order.find({
        paymentStatus: 'unpaid',
        status: 'pending',
        paymentExpireTime: { $lt: currentTime }
      });

      if (expiredOrders.length === 0) {
        console.log(`[${currentTime.toLocaleString()}] 没有发现超时未支付的订单`);
        return;
      }

      console.log(`[${currentTime.toLocaleString()}] 发现 ${expiredOrders.length} 个超时未支付的订单，开始自动取消...`);

      // 批量更新订单状态
      const updateResult = await Order.updateMany(
        {
          paymentStatus: 'unpaid',
          status: 'pending',
          paymentExpireTime: { $lt: currentTime }
        },
        {
          $set: {
            status: 'cancelled',
            cancelledTime: currentTime,
            cancelReason: '支付超时自动取消',
            updateTime: currentTime
          }
        }
      );

      console.log(`[${currentTime.toLocaleString()}] 成功取消 ${updateResult.modifiedCount} 个超时订单`);

      // 记录被取消的订单详情
      expiredOrders.forEach(order => {
        console.log(`- 订单号: ${order.orderNumber}, 金额: ¥${order.totalAmount}, 超时时间: ${order.paymentExpireTime.toLocaleString()}`);
      });

    } catch (error) {
      console.error('检查超时订单时发生错误:', error);
    }
  }

  /**
   * 手动检查一次超时订单（用于测试）
   */
  async manualCheck() {
    console.log('手动执行超时订单检查...');
    await this.checkExpiredOrders();
  }
}

// 创建单例实例
const orderScheduler = new OrderScheduler();

module.exports = orderScheduler;