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
    testTimeCalculation();
})
.catch(err => {
    console.error('数据库连接失败:', err);
    process.exit(1);
});

/**
 * 测试时间计算
 */
function testTimeCalculation() {
    console.log('\n=== 时间计算测试 ===\n');
    
    const currentTime = new Date();
    const paymentExpireTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
    
    console.log('当前系统时间:', currentTime.toString());
    console.log('当前系统时间(本地):', currentTime.toLocaleString());
    console.log('当前时间戳:', currentTime.getTime());
    console.log('');
    
    console.log('支付过期时间:', paymentExpireTime.toString());
    console.log('支付过期时间(本地):', paymentExpireTime.toLocaleString());
    console.log('过期时间戳:', paymentExpireTime.getTime());
    console.log('');
    
    const timeDiff = paymentExpireTime.getTime() - currentTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    console.log('时间差(毫秒):', timeDiff);
    console.log('时间差(分钟):', minutesDiff);
    console.log('');
    
    // 测试相对时间计算
    console.log('=== 相对时间测试 ===');
    const testExpireTime = new Date(Date.now() + 2 * 60 * 1000); // 2分钟后过期
    console.log('测试过期时间(2分钟后):', testExpireTime.toLocaleString());
    
    const remainingTime = Math.max(0, Math.floor((testExpireTime - new Date()) / 1000));
    console.log('剩余秒数:', remainingTime);
    
    // 格式化倒计时显示
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    console.log('格式化倒计时:', `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    
    console.log('\n=== 建议解决方案 ===');
    console.log('1. 系统时间设置为2025年，这是系统级问题');
    console.log('2. 对于开发测试，可以使用相对时间计算');
    console.log('3. 前端倒计时基于相对时间差，不受绝对时间影响');
    console.log('4. 后端定时任务检查过期订单时使用相对时间比较');
    
    process.exit(0);
}

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n收到退出信号，正在清理...');
    mongoose.connection.close();
    process.exit(0);
});