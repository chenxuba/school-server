var express = require('express');
var router = express.Router();
const User = require("../models/User");
const { getWxUserInfo, decryptWxData, generateInviteCode, generateRandomNickname } = require('../utils/index');
var vertoken = require('../utils/token');

/**
 * 微信小程序手机号登录接口
 * POST /api/user/phone-login
 * 
 * 请求参数:
 * - wxSmallCode: 小程序登录code
 * - iv: 手机号加密算法的初始向量
 * - encryptedData: 包括手机号在内的完整用户信息的加密数据
 * - loginType: 登录类型，固定为'phone'
 * - invite: 可选，推荐码
 */
router.post('/phone-login', async (req, res) => {
  try {
    const { wxSmallCode, iv, encryptedData, loginType, invite } = req.body;
    
    // 参数验证
    if (!wxSmallCode || !iv || !encryptedData || loginType !== 'phone') {
      return res.json({
        code: -1,
        message: '参数不完整'
      });
    }
    
    // 1. 通过code获取openid和session_key
    let wxUserInfo;
    try {
      wxUserInfo = await getWxUserInfo(wxSmallCode);
    } catch (error) {
      return res.json({
        code: -1,
        message: '获取微信用户信息失败: ' + error.message
      });
    }
    
    const { openid, session_key, unionid } = wxUserInfo;
    
    // 2. 解密手机号数据
    let phoneData;
    try {
      phoneData = decryptWxData(session_key, encryptedData, iv);
    } catch (error) {
      return res.json({
        code: -1,
        message: '手机号解密失败: ' + error.message
      });
    }
    
    const { phoneNumber, purePhoneNumber, countryCode } = phoneData;
    
    // 3. 查找或创建用户
    let user = await User.findOne({ openid: openid });
    let isNewUser = false;
    
    if (!user) {
      // 新用户，创建用户记录
      isNewUser = true;
      user = new User({
        openid: openid,
        unionid: unionid,
        phone: purePhoneNumber,
        nickname: generateRandomNickname(),
        avatar: 'https://q8.itc.cn/q_70/images03/20240305/5637ad3f16d144ecb5469acbde2b67c7.jpeg',
        lastLoginTime: new Date()
      });
      
      // 处理推荐码
      if (invite) {
        const inviter = await User.findOne({ inviteCode: invite });
        if (inviter) {
          user.invitedBy = inviter._id;
        }
      }
      
      // 生成邀请码
      let inviteCode;
      let isUnique = false;
      while (!isUnique) {
        inviteCode = generateInviteCode();
        const existingUser = await User.findOne({ inviteCode: inviteCode });
        if (!existingUser) {
          isUnique = true;
        }
      }
      user.inviteCode = inviteCode;
      
      await user.save();
    } else {
      // 老用户，更新手机号和登录时间
      user.phone = purePhoneNumber;
      user.lastLoginTime = new Date();
      if (unionid && !user.unionid) {
        user.unionid = unionid;
      }
      await user.save();
    }
    
    // 4. 生成token
    const token = await vertoken.setToken(
      user._id,
      user.openid,
      user.nickname,
      user.avatar
    );
    
    // 5. 返回用户信息
    const userInfo = {
      _id: user._id,
      openid: user.openid,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      inviteCode: user.inviteCode,
      createTime: user.createTime,
      isDelivery: user.isDelivery,
      isReceiver: user.isReceiver,
      isProfileComplete: user.isProfileComplete,
      token:token
    };
    
    res.json({
      code: 200,
      message: isNewUser ? '注册成功' : '登录成功',
      data: userInfo,
    });
    
  } catch (error) {
    console.error('手机号登录错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 完善用户信息接口
 * POST /api/user/update-profile
 * 
 * 请求参数:
 * - nickname: 昵称
 * - avatar: 头像
 * - gender: 性别 (可选)
 */
router.post('/update-profile', async (req, res) => {
  try {
    // 验证token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const userId = tokenData._id;
    
    const { nickname, avatar, gender, city, province, country } = req.body;
    
    if (!nickname || !avatar) {
      return res.json({
        code: -1,
        message: '昵称和头像不能为空'
      });
    }
    
    // 更新用户信息
    const updateData = {
      nickname: nickname,
      avatar: avatar,
      isProfileComplete: true,
      updateTime: new Date()
    };
    
    if (gender !== undefined) updateData.gender = gender;
    if (city) updateData.city = city;
    if (province) updateData.province = province;
    if (country) updateData.country = country;
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );
    
    if (!user) {
      return res.json({
        code: -1,
        message: '用户不存在'
      });
    }
    
    // 重新生成token
    const token = await vertoken.setToken(
      user._id,
      user.openid,
      user.nickname,
      user.avatar
    );
    
    const userInfo = {
      _id: user._id,
      openid: user.openid,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      inviteCode: user.inviteCode,
      createTime: user.createTime,
      isDelivery: user.isDelivery,
      isReceiver: user.isReceiver,
      isProfileComplete:user.isProfileComplete,
      token:token
    };
    
    res.json({
      code: 200,
      message: '用户信息更新成功',
      data: userInfo
    });
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('更新用户信息错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 获取用户信息接口
 * POST /api/user/info
 */
router.post('/info', async (req, res) => {
  try {
    // 验证token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const userId = tokenData._id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.json({
        code: -1,
        message: '用户不存在'
      });
    }
    
    const token = await vertoken.setToken(
      user._id,
      user.openid,
      user.nickname,
      user.avatar
    );
    
    const userInfo = {
      _id: user._id,
      openid: user.openid,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      inviteCode: user.inviteCode,
      createTime: user.createTime,
      isDelivery: user.isDelivery,
      isReceiver: user.isReceiver,
      isProfileComplete:user.isProfileComplete,
      token:token
    };
    
    res.json({
      code: 200,
      message: '获取用户信息成功',
      data: userInfo
    });
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('获取用户信息错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 通过邀请码查找用户
 * GET /api/user/invite/:code
 */
router.get('/invite/:code', async (req, res) => {
  try {
    const inviteCode = req.params.code;
    
    const user = await User.findOne({ inviteCode: inviteCode });
    
    if (!user) {
      return res.json({
        code: -1,
        message: '邀请码不存在'
      });
    }
    
    res.json({
      code: 200,
      message: '查询成功',
      data: {
        nickname: user.nickname,
        avatar: user.avatar,
        inviteCode: user.inviteCode
      }
    });
    
  } catch (error) {
    console.error('查询邀请码错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

module.exports = router;
