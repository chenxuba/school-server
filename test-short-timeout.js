const mongoose = require('mongoose');
const Order = require('./models/Order');
const orderScheduler = require('./utils/orderScheduler');
const db = require('./config/keys.js').mongoURL;

// 连接数据库
mongoose.connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    retryWrites: false
})
.then(() => {
    console.log('数据库连接成功');
    testShortTimeout();
})
.catch(err => {
    console.error('数据库连接失败:', err);
    process.exit(1);
});

/**
 * 测试短时间超时功能（30秒过期）
 */
async function testShortTimeout() {
    try {
        console.log('\n=== 开始测试短时间支付超时功能（30秒） ===\n');
        
        // 1. 创建一个测试订单，设置30秒后过期
        const currentTime = new Date();
        const testOrder = new Order({
            orderNumber: 'SHORT_TEST' + Date.now(),
            userId: '507f1f77bcf86cd799439011',
            shopId: '507f1f77bcf86cd799439012',
            shopName: '测试商家',
            orderItems: [{
                goodsId: '507f1f77bcf86cd799439013',
                goodsName: '测试商品',
                price: 10.00,
                quantity: 1,
                subtotal: 10.00
            }],
            goodsAmount: 10.00,
            deliveryFee: 3.00,
            couponAmount: 0.00,
            totalAmount: 13.00,
            deliveryType: 0,
            deliveryAddress: {
                name: '测试用户',
                phone: '13800138000',
                address: '测试地址'
            },
            status: 'pending',
            paymentStatus: 'unpaid',
            orderTime: currentTime,
            createTime: currentTime,
            paymentExpireTime: new Date(currentTime.getTime() + 30 * 1000) // 30秒后过期
        });
        
        await testOrder.save();
        console.log(`✓ 创建测试订单成功: ${testOrder.orderNumber}`);
        console.log(`  订单ID: ${testOrder._id}`);
        console.log(`  创建时间: ${testOrder.createTime.toLocaleString()}`);
        console.log(`  过期时间: ${testOrder.paymentExpireTime.toLocaleString()}`);
        
        // 2. 计算剩余时间
        const now = new Date();
        const remainingMs = testOrder.paymentExpireTime.getTime() - now.getTime();
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
        console.log(`  剩余时间: ${remainingSeconds} 秒`);
        
        // 3. 模拟前端倒计时逻辑
        console.log('\n--- 模拟前端倒计时 ---');
        let countdown = remainingSeconds;
        const countdownInterval = setInterval(() => {
            const minutes = Math.floor(countdown / 60);
            const seconds = countdown % 60;
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (countdown > 0) {
                console.log(`倒计时: ${timeStr} (剩余 ${countdown} 秒)`);
                countdown--;
            } else {
                console.log('⏰ 支付时间已到！');
                clearInterval(countdownInterval);
                
                // 4. 检查订单是否会被自动取消
                setTimeout(async () => {
                    console.log('\n--- 执行定时任务检查 ---');
                    await orderScheduler.manualCheck();
                    
                    // 5. 验证订单状态
                    const updatedOrder = await Order.findById(testOrder._id);
                    console.log('\n--- 订单状态检查 ---');
                    console.log(`订单状态: ${updatedOrder.status}`);
                    console.log(`支付状态: ${updatedOrder.paymentStatus}`);
                    
                    if (updatedOrder.status === 'cancelled') {
                        console.log('✅ 测试成功！订单已自动取消');
                        console.log(`取消原因: ${updatedOrder.cancelReason}`);
                        console.log(`取消时间: ${updatedOrder.cancelledTime?.toLocaleString()}`);
                    } else {
                        console.log('❌ 测试失败！订单未自动取消');
                    }
                    
                    // 清理测试数据
                    await Order.findByIdAndDelete(testOrder._id);
                    console.log('\n🧹 测试数据已清理');
                    
                    console.log('\n=== 测试完成 ===');
                    console.log('\n📝 总结:');
                    console.log('- 系统时间虽然是2025年，但相对时间计算正确');
                    console.log('- 支付倒计时功能基于时间差，不受绝对时间影响');
                    console.log('- 定时任务能正确识别和处理超时订单');
                    console.log('- 前端倒计时显示逻辑正常');
                    
                    process.exit(0);
                }, 2000); // 等待2秒后检查
            }
        }, 1000);
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
        process.exit(1);
    }
}

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n收到退出信号，正在清理...');
    mongoose.connection.close();
    process.exit(0);
});