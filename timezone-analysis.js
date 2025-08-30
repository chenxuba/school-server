const mongoose = require('mongoose');
const Order = require('./models/Order');
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
    analyzeTimezone();
})
.catch(err => {
    console.error('数据库连接失败:', err);
    process.exit(1);
});

/**
 * 分析时区问题
 */
async function analyzeTimezone() {
    console.log('\n=== 时区问题分析 ===\n');
    
    // 1. 系统时区信息
    console.log('📍 系统时区信息:');
    console.log(`Node.js时区: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`系统环境变量TZ: ${process.env.TZ || '未设置'}`);
    console.log(`时区偏移: ${new Date().getTimezoneOffset()} 分钟 (负数表示东时区)`);
    console.log('');
    
    // 2. 时间对比
    const now = new Date();
    console.log('⏰ 时间对比:');
    console.log(`当前UTC时间: ${now.toISOString()}`);
    console.log(`当前本地时间: ${now.toLocaleString()}`);
    console.log(`当前本地时间(中国): ${now.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
    console.log('');
    
    // 3. 创建测试时间
    const testTime = new Date();
    const expireTime = new Date(testTime.getTime() + 15 * 60 * 1000);
    
    console.log('🧪 测试时间创建:');
    console.log(`创建时间(UTC): ${testTime.toISOString()}`);
    console.log(`创建时间(本地): ${testTime.toLocaleString()}`);
    console.log(`过期时间(UTC): ${expireTime.toISOString()}`);
    console.log(`过期时间(本地): ${expireTime.toLocaleString()}`);
    console.log('');
    
    // 4. 查看数据库中的时间存储
    try {
        const recentOrder = await Order.findOne().sort({createTime: -1});
        if (recentOrder) {
            console.log('💾 数据库时间存储:');
            console.log(`订单号: ${recentOrder.orderNumber}`);
            console.log(`创建时间(原始): ${recentOrder.createTime}`);
            console.log(`创建时间(UTC): ${recentOrder.createTime.toISOString()}`);
            console.log(`创建时间(本地): ${recentOrder.createTime.toLocaleString()}`);
            if (recentOrder.paymentExpireTime) {
                console.log(`过期时间(原始): ${recentOrder.paymentExpireTime}`);
                console.log(`过期时间(UTC): ${recentOrder.paymentExpireTime.toISOString()}`);
                console.log(`过期时间(本地): ${recentOrder.paymentExpireTime.toLocaleString()}`);
            }
        } else {
            console.log('💾 数据库中暂无订单数据');
        }
    } catch (error) {
        console.log('💾 查询数据库时间失败:', error.message);
    }
    
    console.log('');
    
    // 5. 问题解释和解决方案
    console.log('🔍 问题分析:');
    console.log('1. MongoDB默认以UTC时间存储Date对象');
    console.log('2. 你看到的"5点"是UTC时间，对应北京时间13点');
    console.log('3. 这是正常的数据库存储方式，不是配置错误');
    console.log('');
    
    console.log('✅ 解决方案:');
    console.log('方案1: 前端显示时转换为本地时间（推荐）');
    console.log('方案2: 后端返回时转换为本地时间');
    console.log('方案3: 设置MongoDB时区（不推荐，影响全局）');
    console.log('');
    
    console.log('🛠️ 具体实现:');
    console.log('前端: new Date(utcTime).toLocaleString()');
    console.log('后端: date.toLocaleString("zh-CN", {timeZone: "Asia/Shanghai"})');
    console.log('');
    
    // 6. 演示正确的时间处理
    console.log('📝 时间处理演示:');
    const demoTime = new Date('2025-08-30T05:51:18.082Z'); // 你截图中的UTC时间
    console.log(`UTC时间: ${demoTime.toISOString()}`);
    console.log(`转换为北京时间: ${demoTime.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
    console.log(`使用toLocaleString(): ${demoTime.toLocaleString()}`);
    
    process.exit(0);
}

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n收到退出信号，正在清理...');
    mongoose.connection.close();
    process.exit(0);
});