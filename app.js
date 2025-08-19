var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
// var vertoken = require('./utils/token') //引入token 
// var expressJwt = require('express-jwt')
// var redis = require("redis"),
//     client = redis.createClient();
// client.on("error", function(err) {
//     console.log("Error" + err);
// });
const mongoose = require("mongoose");
const db = require("./config/keys.js").mongoURL
mongoose.set('useCreateIndex', true) //加上这个 就不报错 DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead.
// (Use `node --trace-deprecation ...` to show where the warning was created)
mongoose.connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    retryWrites: false
})
    .then((res) => {
        console.log("远程数据库连接成功～～")
    }).catch((err) => {
        console.log(err)
    });

var usersRouter = require('./routes/adminUsers.js');
var userRouter = require('./routes/user');
var upload = require("./routes/upload");
var shopRouter = require('./routes/shop');
var shopAccountRouter = require('./routes/shopAccount');
var goodsMenuRouter = require('./routes/goodsMenu');
var goodsRouter = require('./routes/goods');
var campusRouter = require('./routes/campus');
var tagRouter = require('./routes/tag');


var app = express();
//express 设置允许跨域访问
// app.all('*', function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept,X-File-Name,authorization");
//   res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
//   res.header("Content-Type", "application/json;charset=utf-8");
//   res.header("X-Powered-By", ' 3.2.1');
//   res.header("Cache-Control", "no-store");
//   if (req.method == 'OPTIONS') {
//     res.sendStatus(200).end();
//   } else {
//     next();
//   }
// });
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/admin', usersRouter);
app.use('/api/user', userRouter);
app.use('/api', upload);
app.use('/api/shop', shopRouter);
app.use('/api/shopAccount', shopAccountRouter);
app.use('/api/goodsmenu', goodsMenuRouter);
app.use('/api/goods', goodsRouter);
app.use('/api/campus', campusRouter);
app.use('/api/tag', tagRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
/**
 * socket.io
 */
// require("./routes/mySocket")

module.exports = app;