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
    testPaymentTimeout();
})
.catch(err => {
    console.error('数据库连接失败:', err);
    process.exit(1);
});

/**
 * 测试支付超时功能
 */
async function testPaymentTimeout() {
    try {
        console.log('\n=== 开始测试支付超时功能 ===\n');
        
        // 1. 创建一个测试订单，设置1分钟后过期
        const testOrder = new Order({
            orderNumber: 'TEST' + Date.now(),
            userId: '507f1f77bcf86cd799439011', // 测试用户ID
            shopId: '507f1f77bcf86cd799439012', // 测试商家ID
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
            orderTime: new Date(),
            createTime: new Date(),
            paymentExpireTime: new Date(Date.now() + 60 * 1000) // 1分钟后过期
        });
        
        await testOrder.save();
        console.log(`✓ 创建测试订单成功: ${testOrder.orderNumber}`);
        console.log(`  订单ID: ${testOrder._id}`);
        console.log(`  支付过期时间: ${testOrder.paymentExpireTime.toLocaleString()}`);
        
        // 2. 查询当前未支付订单
        const unpaidOrders = await Order.find({
            paymentStatus: 'unpaid',
            status: 'pending'
        });
        console.log(`\n✓ 当前未支付订单数量: ${unpaidOrders.length}`);
        
        // 3. 手动执行一次定时任务检查
        console.log('\n--- 执行定时任务检查 ---');
        await orderScheduler.manualCheck();
        
        // 4. 等待订单过期后再次检查
        console.log('\n⏰ 等待订单过期（65秒）...');
        setTimeout(async () => {
            console.log('\n--- 订单过期后检查 ---');
            await orderScheduler.manualCheck();
            
            // 5. 验证订单状态是否已更新
            const updatedOrder = await Order.findById(testOrder._id);
            if (updatedOrder.status === 'cancelled') {
                console.log('\n✅ 测试成功！订单已自动取消');
                console.log(`  订单状态: ${updatedOrder.status}`);
                console.log(`  取消原因: ${updatedOrder.cancelReason}`);
                console.log(`  取消时间: ${updatedOrder.cancelledTime?.toLocaleString()}`);
            } else {
                console.log('\n❌ 测试失败！订单未自动取消');
                console.log(`  当前状态: ${updatedOrder.status}`);
            }
            
            // 清理测试数据
            await Order.findByIdAndDelete(testOrder._id);
            console.log('\n🧹 测试数据已清理');
            
            console.log('\n=== 测试完成 ===');
            process.exit(0);
        }, 65000);
        
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