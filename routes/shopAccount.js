const express = require("express");
const router = express.Router();
const md5 = require("blueimp-md5");
const ShopAccount = require("../models/ShopAccount");
const Shop = require("../models/Shop");
const { setToken, getToken } = require("../utils/token");


/**
 * @route POST api/shopAccount/login
 * @desc 商家账号登录
 * @access Public
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        msg: "用户名和密码不能为空"
      });
    }

    // 查找用户（支持用户名、邮箱、手机号登录）
    const shopAccount = await ShopAccount.findOne({
      $or: [
        { username: username },
        { email: username },
        { phone: username }
      ]
    }).populate('shop');

    if (!shopAccount) {
      return res.status(400).json({
        code: 400,
        msg: "用户不存在"
      });
    }

    // 检查账号状态
    if (shopAccount.status === "inactive") {
      return res.status(400).json({
        code: 400,
        msg: "账号已被禁用"
      });
    }

    // 验证密码
    const hashedPassword = md5(password);
    if (hashedPassword !== shopAccount.password) {
      return res.status(400).json({
        code: 400,
        msg: "密码错误"
      });
    }

    // 更新最后登录时间
    shopAccount.lastLoginAt = new Date();
    await shopAccount.save();

    // 生成token
    const token = await setToken(
      shopAccount._id,
      shopAccount.username,
      shopAccount.ownerName,
      shopAccount.avatar
    );

    res.json({
      code: 200,
      msg: "登录成功",
      data: {
        token
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

/**
 * @route GET api/shopAccount/info
 * @desc 获取当前登录商家账号信息
 * @access Private
 */
router.get("/info", async (req, res) => {
  try {
    // 从请求头获取token
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        msg: "未提供认证token"
      });
    }

    // 验证token
    const decoded = await getToken(token);
    
    // 根据token中的用户ID查找用户信息
    const shopAccount = await ShopAccount.findById(decoded._id)
      .populate('shop')
      .select('-password'); // 不返回密码

    if (!shopAccount) {
      return res.status(404).json({
        code: 404,
        msg: "用户不存在"
      });
    }

    // 检查账号状态
    if (shopAccount.status === "inactive") {
      return res.status(403).json({
        code: 403,
        msg: "账号已被禁用"
      });
    }

    res.json({
      code: 200,
      msg: "获取用户信息成功",
      data: {
        shopAccount: {
          id: shopAccount._id,
          username: shopAccount.username,
          email: shopAccount.email,
          phone: shopAccount.phone,
          ownerName: shopAccount.ownerName,
          avatar: shopAccount.avatar,
          status: shopAccount.status,
          role: shopAccount.role,
          shop: shopAccount.shop,
          createdAt: shopAccount.createdAt,
          lastLoginAt: shopAccount.lastLoginAt
        }
      }
    });
  } catch (err) {
    console.error(err.error);
    res.status(401).json({
        code: 401,
        msg: "token无效"
      });
  }
});

/**
 * @route PUT api/shopAccount/profile
 * @desc 更新商家账号信息
 * @access Private
 */
router.put("/profile", async (req, res) => {
  try {
    // 从请求头获取token
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        msg: "未提供认证token"
      });
    }

    // 验证token
    const decoded = await getToken(token);
    
    const {
      ownerName,
      email,
      phone,
      avatar
    } = req.body;

    // 构建更新对象
    const updateFields = {};
    if (ownerName) updateFields.ownerName = ownerName;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (avatar) updateFields.avatar = avatar;

    // 如果更新邮箱，检查是否已存在
    if (email) {
      const existingEmail = await ShopAccount.findOne({ 
        email: email, 
        _id: { $ne: decoded._id } 
      });
      if (existingEmail) {
        return res.status(400).json({
          code: 400,
          msg: "邮箱已被其他用户使用"
        });
      }
    }

    // 如果更新手机号，检查是否已存在
    if (phone) {
      const existingPhone = await ShopAccount.findOne({ 
        phone: phone, 
        _id: { $ne: decoded._id } 
      });
      if (existingPhone) {
        return res.status(400).json({
          code: 400,
          msg: "手机号已被其他用户使用"
        });
      }
    }

    // 更新用户信息
    const shopAccount = await ShopAccount.findByIdAndUpdate(
      decoded._id,
      { $set: updateFields },
      { new: true }
    ).populate('shop').select('-password');

    if (!shopAccount) {
      return res.status(404).json({
        code: 404,
        msg: "用户不存在"
      });
    }

    res.json({
      code: 200,
      msg: "更新成功",
      data: {
        shopAccount: {
          id: shopAccount._id,
          username: shopAccount.username,
          email: shopAccount.email,
          phone: shopAccount.phone,
          ownerName: shopAccount.ownerName,
          avatar: shopAccount.avatar,
          status: shopAccount.status,
          role: shopAccount.role,
          shop: shopAccount.shop
        }
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.error === 'token 是空的') {
      return res.status(401).json({
        code: 401,
        msg: "token无效"
      });
    }
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

/**
 * @route POST api/shopAccount/change-password
 * @desc 修改密码
 * @access Private
 */
router.post("/change-password", async (req, res) => {
  try {
    // 从请求头获取token
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        msg: "未提供认证token"
      });
    }

    // 验证token
    const decoded = await getToken(token);
    
    const { oldPassword, newPassword } = req.body;

    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        code: 400,
        msg: "旧密码和新密码不能为空"
      });
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return res.status(400).json({
        code: 400,
        msg: "新密码长度至少6位"
      });
    }

    // 查找用户
    const shopAccount = await ShopAccount.findById(decoded._id);
    if (!shopAccount) {
      return res.status(404).json({
        code: 404,
        msg: "用户不存在"
      });
    }

    // 验证旧密码
    const oldHashedPassword = md5(oldPassword);
    if (oldHashedPassword !== shopAccount.password) {
      return res.status(400).json({
        code: 400,
        msg: "旧密码错误"
      });
    }

    // 加密新密码
    const hashedPassword = md5(newPassword);

    // 更新密码
    shopAccount.password = hashedPassword;
    await shopAccount.save();

    res.json({
      code: 200,
      msg: "密码修改成功"
    });
  } catch (err) {
    console.error(err.message);
    if (err.error === 'token 是空的') {
      return res.status(401).json({
        code: 401,
        msg: "token无效"
      });
    }
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

module.exports = router;
