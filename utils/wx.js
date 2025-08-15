/*********************************************************************************
 * @file: 返回微信开发需要的config数据
 * @desc:
 *      1,通过appid和secret获取access_token
 *      2.根据access_token获取ticket
 *      3.根据ticket和url(访问的页面地址由接口传过来 )通过sgin加密返回前度需要用到的config数据
 * @ahthor: leinov
 * @usedate:2018-11-07
 **********************************************************************************/

 const request = require("request");
//  const Base64 = require("js-base64").Base64;
 const sign = require("./sign.js");
 const base = {
     appId: "wx68a68c307c224cf8", //公众号的appid
     secret: "1800016f10b0b87eb7a8d80a4372ca38", //公众号的secret 重要不要暴露给前端
    //  appId: "wxf11b8b60b6608df8", //公众号的appid
    //  secret: "85d17560d4274b105f6a2d689f270916 ", //公众号的secret 重要不要暴露给前端
     wxapi: "https://api.weixin.qq.com/cgi-bin"
 };
 
 /**
  * 根据appid,secret获取access_token
  */
 function getAccessToken() {
     return new Promise((resolve, reject) => {
         request.get(`${base.wxapi}/token?grant_type=client_credential&appid=${base.appId}&secret=${base.secret}`, function(error, response, body) {
             if (error !== null) {
                 reject("获取access_token失败 检查getAccessToken函数");
             }
 
             resolve(JSON.parse(body));
         });
     });
 }
 
 /**
  * 根据access_token获取api_ticket
  *
  * @param  {String} access_token
  * @return {Promise}
  */
 function getTicket(access_token) {
     return new Promise((resolve, reject) => {
         request.get(`${base.wxapi}/ticket/getticket?access_token=${access_token}&type=jsapi`, function(error, response, body) {
             if (error !== null) {
                 reject("获取api_ticket失败 检查getTicket函数");
             }
 
             resolve(JSON.parse(body));
         });
     });
 }
 
 /**
  * 根据api_ticket和url通过加密返回所有config数据
  *
  * @param  {String} href
  * @return {Object} configdata
  */
 async function getConfigData(href) {
     let configData;
     try {
         const accessTokenData = await getAccessToken();
         const ticketData = await getTicket(accessTokenData.access_token);
         const decodeHref = (href);
         configData = sign(ticketData.ticket, decodeHref);
         configData.appId = base.appId;
     } catch (err) {
         //打印错误日志
         console.log(err);
         configData = {};
     }
     return configData;
 }
 
 module.exports = getConfigData;