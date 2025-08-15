var express = require('express'); //引入express
var router = express.Router(); //定义路由级中间件
let qn = require('../config/qiniu');
//结果包装函数
let result = function(obj, bool) {
    if (bool) {
        return {
            status: 0,
            data: obj
        };
    } else {
        return {
            status: 1,
            data: obj
        };
    }
}
//上传接口
router.post("/upImg", function(req, routerRes) {
    qn.upImg(req, function(res) {
        // console.log('res', res);
        if (res.status == 0) {
            routerRes.json(result(res.data, true));
        } else {
            routerRes.json(result(res.msg, false));
        }
    });
})
module.exports = router;