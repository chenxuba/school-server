const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const md5 = require("blueimp-md5");
const Shop = require("../models/Shop");
const ShopAccount = require("../models/ShopAccount");

/**
 * Helper function to check if current time is within shop business hours
 * @param {String} openTime - Opening time in format "HH:MM"
 * @param {String} closeTime - Closing time in format "HH:MM"
 * @returns {Boolean} - true if current time is within business hours
 */
const isWithinBusinessHours = (openTime, closeTime) => {
  // Get current time
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  
  // Parse opening hours
  const [openHours, openMinutes] = openTime.split(":").map(Number);
  
  // Parse closing hours
  const [closeHours, closeMinutes] = closeTime.split(":").map(Number);
  
  // Convert all times to minutes for easier comparison
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;
  const openTimeInMinutes = openHours * 60 + openMinutes;
  const closeTimeInMinutes = closeHours * 60 + closeMinutes;
  
  // Check if current time is within business hours
  return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes <= closeTimeInMinutes;
};

/**
 * @route POST api/shop/test
 * @desc 测试简化版本的创建接口
 * @access Private
 */
router.post("/test", async (req, res) => {
  try {
    console.log("测试接口被调用");
    res.json({
      code: 200,
      msg: "测试成功",
      data: { test: true }
    });
  } catch (err) {
    console.error("测试接口错误:", err);
    res.status(500).json({
      code: 500,
      msg: "测试接口错误: " + err.message
    });
  }
});

/**
 * @route POST api/shop/create
 * @desc 创建店铺并同步创建商家账号
 * @access Private
 */
router.post("/create", async (req, res) => {
  try {
    const {
      // 店铺信息
      shopName,
      description,
      logo,
      banners,
      businessLicense,
      businessHours,
      businessStatus,
      address,
      contactPhone,
      contactWechat,
      // 商家账号信息
      username,
      email,
      ownerName,
      password = "123456" // 默认密码
    } = req.body;

    // 检查必填字段
    if (!shopName) {
      return res.status(400).json({ 
        code: 400, 
        msg: "店铺名称不能为空" 
      });
    }
    
    if (!username) {
      return res.status(400).json({ 
        code: 400, 
        msg: "商家用户名不能为空" 
      });
    }
    
    if (!email) {
      return res.status(400).json({ 
        code: 400, 
        msg: "商家邮箱不能为空" 
      });
    }
    
    if (!ownerName) {
      return res.status(400).json({ 
        code: 400, 
        msg: "商家姓名不能为空" 
      });
    }
    
    if (!contactPhone) {
      return res.status(400).json({ 
        code: 400, 
        msg: "联系电话不能为空" 
      });
    }

    // 检查商家账号信息是否已存在
    const existingUsername = await ShopAccount.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        code: 400,
        msg: "用户名已存在"
      });
    }

    const existingEmail = await ShopAccount.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        code: 400,
        msg: "邮箱已被注册"
      });
    }

    const existingPhone = await ShopAccount.findOne({ phone: contactPhone });
    if (existingPhone) {
      return res.status(400).json({
        code: 400,
        msg: "手机号已被注册"
      });
    }

    // 使用普通方式创建（不使用事务）
    console.log("开始创建商家账号和店铺");
    
    // 1. 先创建商家账号
    const hashedPassword = md5(password);
    const newShopAccount = new ShopAccount({
      username,
      password: hashedPassword,
      email,
      phone: contactPhone,
      ownerName,
      status: "active"
    });

    console.log("准备保存商家账号");
    const shopAccount = await newShopAccount.save();
    console.log("商家账号创建成功:", shopAccount._id);

    // 2. 创建店铺对象并关联商家账号
    const shopFields = {};
    
    // 店铺详细信息
    shopFields.shopName = shopName;
    if (description) shopFields.description = description;
    if (logo) shopFields.logo = logo;
    if (banners) shopFields.banners = banners;
    
    // 营业信息
    if (businessLicense) shopFields.businessLicense = businessLicense;
    if (businessHours) {
      shopFields.businessHours = {};
      if (businessHours.open) shopFields.businessHours.open = businessHours.open;
      if (businessHours.close) shopFields.businessHours.close = businessHours.close;
    }
    if (businessStatus) shopFields.businessStatus = businessStatus;
    
    // 位置信息
    if (address) shopFields.address = address;
    
    // 联系方式
    shopFields.contactPhone = contactPhone;
    if (contactWechat) shopFields.contactWechat = contactWechat;
    
    // 关联商家账号
    shopFields.owner = shopAccount._id;

    // 创建新店铺
    console.log("准备创建店铺");
    const newShop = new Shop(shopFields);
    const shop = await newShop.save();
    console.log("店铺创建成功:", shop._id);

    // 3. 更新商家账号关联店铺
    shopAccount.shop = shop._id;
    const updatedShopAccount = await shopAccount.save();
    console.log("商家账号更新成功");

    // 生成token
    console.log("准备生成token");
    const { setToken } = require("../utils/token");
    const token = await setToken(
      shopAccount._id,
      shopAccount.username,
      shopAccount.ownerName,
      shopAccount.avatar
    );
    console.log("token生成成功");

    res.json({
      code: 200,
      msg: "店铺和商家账号创建成功",
      data: {
        shop: shop,
        shopAccount: {
          id: shopAccount._id,
          username: shopAccount.username,
          email: shopAccount.email,
          phone: shopAccount.phone,
          ownerName: shopAccount.ownerName,
          avatar: shopAccount.avatar,
          status: shopAccount.status,
          role: shopAccount.role
        },
        token: token
      }
    });

  } catch (err) {
    console.error(err.message);
    
    // 处理特定的数据库错误
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      let message = "数据已存在";
      switch(field) {
        case 'username':
          message = "用户名已存在";
          break;
        case 'email':
          message = "邮箱已被注册";
          break;
        case 'phone':
          message = "手机号已被注册";
          break;
      }
      return res.status(400).json({
        code: 400,
        msg: message
      });
    }
    
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

/**
 * @route GET api/shop
 * @desc 获取所有店铺
 * @access Public
 */
router.get("/", async (req, res) => {
  try {
    const shops = await Shop.find().sort({ date: -1 });
    res.json({
      code:200,
      msg:"店铺获取成功",
      data:shops
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("服务器错误");
  }
});

/**
 * @route GET api/shop/:id
 * @desc 根据ID获取店铺
 * @access Public
 */
router.get("/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ msg: "店铺不存在" });
    }
    
    res.json({
      code:200,
      msg:"店铺获取成功",
      data:shop
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "店铺不存在" });
    }
    res.status(500).send("服务器错误");
  }
});

/**
 * @route PUT api/shop/:id
 * @desc 更新店铺信息
 * @access Private
 */
router.put("/:id", async (req, res) => {
  try {
    const {
      shopName,
      description,
      logo,
      banners,
      businessLicense,
      businessHours,
      businessStatus,
      address,
      contactPhone,
      contactWechat
    } = req.body;

    // 构建店铺对象
    const shopFields = {};
    
    // 店铺详细信息
    if (shopName) shopFields.shopName = shopName;
    if (description) shopFields.description = description;
    if (logo) shopFields.logo = logo;
    if (banners) shopFields.banners = banners;
    
    // 营业信息
    if (businessLicense) shopFields.businessLicense = businessLicense;
    if (businessHours) {
      shopFields.businessHours = {};
      if (businessHours.open) shopFields.businessHours.open = businessHours.open;
      if (businessHours.close) shopFields.businessHours.close = businessHours.close;
    }
    if (businessStatus) shopFields.businessStatus = businessStatus;
    
    // 位置信息
    if (address) shopFields.address = address;

    // 联系方式
    if (contactPhone) shopFields.contactPhone = contactPhone;
    if (contactWechat) shopFields.contactWechat = contactWechat;

    // 更新店铺
    let shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ msg: "店铺不存在" });
    }
    
    shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { $set: shopFields },
      { new: true }
    );
    
    res.json({
      code:200,
      msg:"店铺更新成功",
      data:shop
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("服务器错误");
  }
});

/**
 * @route DELETE api/shop/:id
 * @desc 删除店铺
 * @access Private
 */
router.delete("/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ msg: "店铺不存在" });
    }
    
    await shop.remove();
    
    res.json({
      code:200,
      msg:"店铺删除成功",
      data:shop
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "店铺不存在" });
    }
    res.status(500).send("服务器错误");
  }
});

/**
 * @route GET api/shop/update-status/:id
 * @desc 根据营业时间自动更新店铺营业状态
 * @access Public
 */
router.get("/update-status/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ msg: "店铺不存在" });
    }
    
    // 获取店铺的营业时间
    const { open, close } = shop.businessHours;
    
    // 检查当前时间是否在营业时间内
    const isOpen = isWithinBusinessHours(open, close);
    
    // 更新营业状态 (1: 营业中, 2: 休息中)
    const newStatus = isOpen ? "1" : "2";
    
    // 只有当状态需要变更时才更新数据库
    if (shop.businessStatus !== newStatus) {
      shop.businessStatus = newStatus;
      await shop.save();
    }
    
    res.json({
      code: 200,
      msg: "店铺状态更新成功",
      data: {
        shopId: shop._id,
        businessStatus: shop.businessStatus,
        isOpen: isOpen,
        businessHours: shop.businessHours
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "店铺不存在" });
    }
    res.status(500).send("服务器错误");
  }
});

/**
 * @route GET api/shop/update-all-status
 * @desc 批量更新所有店铺的营业状态
 * @access Public
 */
router.get("/update-all-status", async (req, res) => {
  try {
    // 获取所有店铺
    const shops = await Shop.find();
    const results = [];
    
    // 遍历每个店铺并更新状态
    for (const shop of shops) {
      const { open, close } = shop.businessHours;
      const isOpen = isWithinBusinessHours(open, close);
      const newStatus = isOpen ? "1" : "2";
      
      // 只有当状态需要变更时才更新数据库
      if (shop.businessStatus !== newStatus) {
        shop.businessStatus = newStatus;
        await shop.save();
      }
      
      results.push({
        shopId: shop._id,
        shopName: shop.shopName,
        businessStatus: shop.businessStatus,
        isOpen: isOpen
      });
    }
    
    res.json({
      code: 200,
      msg: "所有店铺状态更新成功",
      data: results
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("服务器错误");
  }
});

module.exports = router;
