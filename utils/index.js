const crypto = require('crypto');
const request = require('request');

// 判断当前时间是否在某个时间段内
function time_range(beginTime, endTime) {
  var strb = beginTime.split(":");
  if (strb.length != 2) {
    return false;
  }
  var stre = endTime.split(":");
  if (stre.length != 2) {
    return false;
  }
  var b = new Date();
  var e = new Date();
  var n = new Date();
  b.setHours(strb[0]);
  b.setMinutes(strb[1]);
  e.setHours(stre[0]);
  e.setMinutes(stre[1]);
  if (n.getTime() - b.getTime() > 0 && n.getTime() - e.getTime() < 0) {
    // console.log(true)
    return true;
  } else {
    // console.log(false)
    return false;
  }
}

/**
 * 微信小程序配置
 */
const wxConfig = require('../config/wxConfig');

/**
 * 通过code获取微信用户的openid和session_key
 * @param {string} code 微信小程序登录code
 * @returns {Promise}
 */
function getWxUserInfo(code) {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${wxConfig.appId}&secret=${wxConfig.appSecret}&js_code=${code}&grant_type=authorization_code`;
    
    request.get(url, (error, response, body) => {
      if (error) {
        reject(error);
        return;
      }
      
      try {
        const data = JSON.parse(body);
        if (data.errcode) {
          reject(new Error(data.errmsg || '获取微信用户信息失败'));
        } else {
          resolve(data);
        }
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * 解密微信加密数据
 * @param {string} sessionKey 微信session_key
 * @param {string} encryptedData 加密数据
 * @param {string} iv 初始向量
 * @returns {object} 解密后的数据
 */
function decryptWxData(sessionKey, encryptedData, iv) {
  const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
  const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');
  
  try {
    const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
    decipher.setAutoPadding(true);
    
    let decrypted = decipher.update(encryptedDataBuffer, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    const decryptedData = JSON.parse(decrypted);
    
    // 验证数据完整性
    if (decryptedData.watermark.appid !== wxConfig.appId) {
      throw new Error('数据校验失败');
    }
    
    return decryptedData;
  } catch (error) {
    throw new Error('数据解密失败: ' + error.message);
  }
}

/**
 * 生成随机字符串
 * @param {number} length 字符串长度
 * @returns {string} 随机字符串
 */
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成邀请码
 * @returns {string} 邀请码
 */
function generateInviteCode() {
  return generateRandomString(8).toUpperCase();
}

/**
 * 生成随机昵称
 * @returns {string} 随机昵称，格式为"未命名_xxxxx"
 */
function generateRandomNickname() {
  const randomSuffix = Math.random().toString(36).substr(2, 5);
  return `未命名_${randomSuffix}`;
}

module.exports = {
  time_range,
  getWxUserInfo,
  decryptWxData,
  generateRandomString,
  generateInviteCode,
  generateRandomNickname,
  wxConfig
}