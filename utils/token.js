var jwt = require('jsonwebtoken'); //jwt
var jwtScrect = 'aoaoe'; //签名
//登录接口 生成token的方法
var setToken = function(_id, loginame,  nickname, avatar) {
    return new Promise((resolve, reject) => {
        //expiresln 设置token过期的时间
        //{ loginame: loginame, _id: _id } 传入需要解析的值（ 一般为用户名，用户id 等）
        // const rule = { _id: _id, loginame: loginame, identity: identity, phone: phone };
        const rule = { _id: _id, loginame: loginame, nickname: nickname,  avatar: avatar };
        // const token = 'Bearer ' + jwt.sign(rule, jwtScrect, { expiresIn: '36000' });
        const token = jwt.sign(rule, jwtScrect, { expiresIn: '1day' });
        resolve(token)
    })
}

//各个接口需要验证token的方法
var getToken = function(token) {
    return new Promise((resolve, reject) => {
        if (!token) {
            console.log('token是空的')
            reject({
                error: 'token 是空的'
            })
        } else {
            //第二种  改版后的
            var info = jwt.verify(token, jwtScrect);
            resolve(info); //解析返回的值（sign 传入的值）
        }
    })
}

module.exports = {
    setToken,
    getToken
}