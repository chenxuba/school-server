var express = require('express');
var router = express.Router();
const md5 = require('blueimp-md5')
const AdminUser = require("../models/AdminUser"); //引入模块模型
var vertoken = require('../utils/token') //引入token 
const mongoose = require("mongoose");
function randomString (e) {
    e = e || 32;
    var t = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678",
        a = t.length,
        n = "";
    for (i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
    return n
}
//注册接口
router.post('/register', (req, res) => {
    const newUser = new AdminUser({ // 用户传参
        username: req.body.username,
        password: md5(req.body.password),
        nickname: '超级管理员',
        avatar: 'https://picsum.photos/100/100?random=' + randomString(3),
    });
    const username = req.body.username;
    AdminUser.find({
        username: username
    }, (err, docs) => {
        if (docs.length > 0) {
            res.json({
                code: -1,
                message: '用户名已存在'
            })
        } else { // 向logins集合中保存数据
            console.log(newUser);
            newUser.save(err => {
                const datas = err ? {
                    code: -1,
                    message: '系统出错，攻城狮正在加急处理中...',
                    data: err.errors
                } : {
                    code: 200,
                    message: '注册成功'
                }
                res.json(datas);
            });
        }
    })
});
//用户名密码登录接口
router.post('/login', (req, res) => {
    const username = req.body.username;
    const password = md5(req.body.password);
    if (username == '') {
        res.json({
            code: -1,
            message: '用户名不能为空'
        })
        return false
    }

    AdminUser.find({ username: username }, (err, users) => {
        if (users.length === 0) {
            res.json({
                code: -1,
                message: '该用户不存在'
            });
        } else if (users[0].password === password) {
            vertoken.setToken(users[0]._id, users[0].username, users[0].huixinCode, users[0].nickname, users[0].avatar).then((token) => {
                res.json({
                    code: 200,
                    token: token,
                    message: '登录成功'
                })
            })
        } else if (users[0].password !== password) {
            res.json({
                code: -1,
                message: '用户名或密码错误'
            });
        }
    });
})
//获取用户信息
router.post('/getInfo', (req, res) => {
    vertoken.getToken(req.headers.authorization).then((data) => {
        AdminUser.find({ _id: data._id }, (err, users) => {
            if (users.length === 0) {
                res.json({
                    code: -1,
                    data: {},
                    message: '该用户不存在'
                });
            } else {
                res.json({
                    code: 200,
                    data: users[0],
                    message: '查询成功'
                })
            }
        })
    }).catch((error) => {
        res.json({
            code: 401,
            message: "token失效了"
        })
    })

})

router.post('/test',(req,res)=>{
    res.json({
        code:200,
        success:true,
        message:"测试成功"
    })
})
module.exports = router;