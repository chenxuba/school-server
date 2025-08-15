// 1.  在项目内新建一个 qiniuConfig.js 文件，内容如下：
// let config = {};
// config.accessKey = 'dfFiJ0TXfhoohrb8nHB9pYHd-AiE6m44AlAFxK72'; //七牛的AK
// config.secretKey = 'Q1XfZHbB4eiOC00NUoQ9vcG-1_VqgRTljRUrduWA'; //七牛的SK
// config.bucket = 'aoaoe'; //存储空间的名字
// config.url = 'qhtz0fgkm.hd-bkt.clouddn.com'; //配置的域名,我直接用的他自己生成的
// module.exports = config;

//七牛云配置文件
const qiniu = require('qiniu')

// 创建上传凭证（accessKey 和 secretKey在七牛云个人中心中有，lytton是七牛云刚才创建的空间名称）
const accessKey = 'dfFiJ0TXfhoohrb8nHB9pYHd-AiE6m44AlAFxK72'
const secretKey = 'Q1XfZHbB4eiOC00NUoQ9vcG-1_VqgRTljRUrduWA'
const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
const options = {
  scope: 'aoaoe', //这是你创建存储空间的名子
  // deadline: 1695523678 //这是七牛云生成token的有效期，单位时秒，不设置默认是3600S，一串数字是时间戳
}
const putPolicy = new qiniu.rs.PutPolicy(options)
const uploadToken = putPolicy.uploadToken(mac)

module.exports = {
  uploadToken  //导出的是七牛云生成的token，很重要
}

