var express = require('express');
var router = express.Router();
const User = require("../models/User");
const DeliveryApplication = require("../models/DeliveryApplication");
const Campus = require("../models/Campus");
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
      user.avatar,
      user.defaultCampus
    );
    
    // 5. 返回用户信息
    let defaultCampusName = null;
    if (user.defaultCampus) {
      try {
        const campus = await Campus.findById(user.defaultCampus);
        if (campus) {
          defaultCampusName = campus.campusName;
        }
      } catch (e) {}
    }

    const userInfo = {
      _id: user._id,
      openid: user.openid,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      defaultCampus: user.defaultCampus,
      defaultCampusName: defaultCampusName,
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
      user.avatar,
      user.defaultCampus
    );
    
    let defaultCampusName = null;
    if (user.defaultCampus) {
      try {
        const campus = await Campus.findById(user.defaultCampus);
        if (campus) {
          defaultCampusName = campus.campusName;
        }
      } catch (e) {}
    }

    const userInfo = {
      _id: user._id,
      openid: user.openid,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      defaultCampus: user.defaultCampus,
      defaultCampusName: defaultCampusName,
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
      user.avatar,
      user.defaultCampus
    );
    
    const userInfo = {
      _id: user._id,
      openid: user.openid,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      defaultCampus: user.defaultCampus,
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

/**
 * 申请成为配送员接口
 * POST /api/user/apply-delivery
 * 
 * 请求参数:
 * - realName: 真实姓名
 * - idNumber: 身份证号
 * - studentNumber: 学号
 * - phone: 手机号
 * - idCardFrontUrl: 身份证正面照片URL
 * - idCardBackUrl: 身份证反面照片URL
 */
router.post('/apply-delivery', async (req, res) => {
  try {
    // 验证token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const userId = tokenData._id;
    
    const { realName, idNumber, studentNumber, phone, idCardFrontUrl, idCardBackUrl } = req.body;
    
    // 参数验证
    if (!realName || !idNumber || !studentNumber || !phone || !idCardFrontUrl || !idCardBackUrl) {
      return res.json({
        code: -1,
        message: '所有字段都是必填的'
      });
    }
    
    // 验证身份证号格式（简单验证）
    const idNumberRegex = /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    if (!idNumberRegex.test(idNumber)) {
      return res.json({
        code: -1,
        message: '身份证号格式不正确'
      });
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.json({
        code: -1,
        message: '手机号格式不正确'
      });
    }
    
    // 检查是否已经有待审核的配送员申请
    const existingApplication = await DeliveryApplication.findOne({
      userId: userId,
      applicationType: 'delivery',
      status: 'pending'
    });
    
    if (existingApplication) {
      return res.json({
        code: -1,
        message: '您已有待审核的配送员申请，请勿重复提交'
      });
    }
    
    // 检查是否已经是配送员
    const user = await User.findById(userId);
    if (user.isDelivery) {
      return res.json({
        code: -1,
        message: '您已经是配送员了'
      });
    }
    
    // 创建申请记录
    const application = new DeliveryApplication({
      userId: userId,
      applicationType: 'delivery',
      realName: realName,
      idNumber: idNumber,
      studentNumber: studentNumber,
      phone: phone,
      idCardFrontUrl: idCardFrontUrl,
      idCardBackUrl: idCardBackUrl
    });
    
    await application.save();
    
    res.json({
      code: 200,
      message: '配送员申请提交成功，请等待审核',
      data: {
        applicationId: application._id,
        status: application.status,
        createTime: application.createTime
      }
    });
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('申请配送员错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 申请成为接单员接口
 * POST /api/user/apply-receiver
 * 
 * 请求参数:
 * - realName: 真实姓名
 * - idNumber: 身份证号
 * - studentNumber: 学号
 * - phone: 手机号
 * - idCardFrontUrl: 身份证正面照片URL
 * - idCardBackUrl: 身份证反面照片URL
 */
router.post('/apply-receiver', async (req, res) => {
  try {
    // 验证token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const userId = tokenData._id;
    
    const { realName, idNumber, studentNumber, phone, idCardFrontUrl, idCardBackUrl } = req.body;
    
    // 参数验证
    if (!realName || !idNumber || !studentNumber || !phone || !idCardFrontUrl || !idCardBackUrl) {
      return res.json({
        code: -1,
        message: '所有字段都是必填的'
      });
    }
    
    // 验证身份证号格式（简单验证）
    const idNumberRegex = /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    if (!idNumberRegex.test(idNumber)) {
      return res.json({
        code: -1,
        message: '身份证号格式不正确'
      });
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.json({
        code: -1,
        message: '手机号格式不正确'
      });
    }
    
    // 检查是否已经有待审核的接单员申请
    const existingApplication = await DeliveryApplication.findOne({
      userId: userId,
      applicationType: 'receiver',
      status: 'pending'
    });
    
    if (existingApplication) {
      return res.json({
        code: -1,
        message: '您已有待审核的接单员申请，请勿重复提交'
      });
    }
    
    // 检查是否已经是接单员
    const user = await User.findById(userId);
    if (user.isReceiver) {
      return res.json({
        code: -1,
        message: '您已经是接单员了'
      });
    }
    
    // 创建申请记录
    const application = new DeliveryApplication({
      userId: userId,
      applicationType: 'receiver',
      realName: realName,
      idNumber: idNumber,
      studentNumber: studentNumber,
      phone: phone,
      idCardFrontUrl: idCardFrontUrl,
      idCardBackUrl: idCardBackUrl
    });
    
    await application.save();
    
    res.json({
      code: 200,
      message: '接单员申请提交成功，请等待审核',
      data: {
        applicationId: application._id,
        status: application.status,
        createTime: application.createTime
      }
    });
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('申请接单员错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 查询申请状态接口
 * POST /api/user/application-status
 * 
 * 请求参数:
 * - applicationType: 申请类型 (delivery | receiver)
 */
router.post('/application-status', async (req, res) => {
  try {
    // 验证token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const userId = tokenData._id;
    
    const { applicationType } = req.body;
    
    if (!applicationType || !['delivery', 'receiver'].includes(applicationType)) {
      return res.json({
        code: -1,
        message: '申请类型参数错误'
      });
    }
    
    // 查询最新的申请记录
    const application = await DeliveryApplication.findOne({
      userId: userId,
      applicationType: applicationType
    }).sort({ createTime: -1 });
    
    if (!application) {
      return res.json({
        code: 200,
        message: '查询成功',
        data: {
          hasApplication: false,
          status: null
        }
      });
    }
    
    res.json({
      code: 200,
      message: '查询成功',
      data: {
        hasApplication: true,
        applicationId: application._id,
        status: application.status,
        reviewComment: application.reviewComment,
        createTime: application.createTime,
        reviewTime: application.reviewTime
      }
    });
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('查询申请状态错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 获取用户申请列表接口
 * POST /api/user/my-applications
 */
router.post('/my-applications', async (req, res) => {
  try {
    // 验证token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const userId = tokenData._id;
    
    // 查询用户的所有申请记录
    const applications = await DeliveryApplication.find({
      userId: userId
    }).sort({ createTime: -1 });
    
    const formattedApplications = applications.map(app => ({
      applicationId: app._id,
      applicationType: app.applicationType,
      realName: app.realName,
      studentNumber: app.studentNumber,
      phone: app.phone,
      status: app.status,
      reviewComment: app.reviewComment,
      createTime: app.createTime,
      reviewTime: app.reviewTime
    }));
    
    res.json({
      code: 200,
      message: '查询成功',
      data: formattedApplications
    });
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('查询申请列表错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 绑定默认校区
 * POST /api/user/bind-default-campus
 * body: { campusId }
 */
router.post('/bind-default-campus', async (req, res) => {
  try {
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const userId = tokenData._id;

    const { campusId } = req.body;
    if (!campusId) {
      return res.json({
        code: -1,
        message: '参数不完整: 缺少campusId'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({
        code: -1,
        message: '用户不存在'
      });
    }

    if (user.defaultCampus) {
      return res.json({
        code: -1,
        message: '已绑定默认校区，如需修改请使用修改接口'
      });
    }

    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.json({
        code: -1,
        message: '校区不存在'
      });
    }
    if (campus.status !== '1') {
      return res.json({
        code: -1,
        message: '校区未启用，无法绑定'
      });
    }

    user.defaultCampus = campus._id;
    user.updateTime = new Date();
    await user.save();

    // 重新生成包含默认校区的 token
    const token = await vertoken.setToken(
      user._id,
      user.openid,
      user.nickname,
      user.avatar,
      user.defaultCampus
    );

    return res.json({
      code: 200,
      message: '默认校区绑定成功',
      data: {
        userId: user._id,
        defaultCampus: user.defaultCampus,
        token: token
      }
    });
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    console.error('绑定默认校区错误:', error);
    return res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 修改默认校区
 * POST /api/user/update-default-campus
 * body: { campusId }
 */
router.post('/update-default-campus', async (req, res) => {
  try {
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const userId = tokenData._id;
    console.log(tokenData);
    
    const { campusId } = req.body;
    if (!campusId) {
      return res.json({
        code: -1,
        message: '参数不完整: 缺少campusId'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({
        code: -1,
        message: '用户不存在'
      });
    }

    if (!user.defaultCampus) {
      return res.json({
        code: -1,
        message: '尚未绑定默认校区，请先绑定'
      });
    }

    if (String(user.defaultCampus) === String(campusId)) {
      return res.json({
        code: 200,
        message: '默认校区未变化',
        data: {
          userId: user._id,
          defaultCampus: user.defaultCampus
        }
      });
    }

    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.json({
        code: -1,
        message: '校区不存在'
      });
    }
    if (campus.status !== '1') {
      return res.json({
        code: -1,
        message: '校区未启用，无法设置为默认'
      });
    }

    user.defaultCampus = campus._id;
    user.updateTime = new Date();
    await user.save();

    // 重新生成包含默认校区的 token
    const token = await vertoken.setToken(
      user._id,
      user.openid,
      user.nickname,
      user.avatar,
      user.defaultCampus
    );

    return res.json({
      code: 200,
      message: '默认校区更新成功',
      data: {
        userId: user._id,
        defaultCampus: user.defaultCampus,
        token: token
      }
    });
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    console.error('更新默认校区错误:', error);
    return res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});
module.exports = router;
