const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Campus = require("../models/Campus");

/**
 * @route POST api/campus/create
 * @desc 创建校区
 * @access Private
 */
router.post("/create", async (req, res) => {
  try {
    const {
      campusName,
      description,
      address,
      location,
      status,
      contactPhone,
      contactEmail,
      manager
    } = req.body;

    // 检查必填字段
    if (!campusName) {
      return res.status(400).json({ 
        code: 400, 
        msg: "校区名称不能为空" 
      });
    }
    
    if (!address) {
      return res.status(400).json({ 
        code: 400, 
        msg: "校区地址不能为空" 
      });
    }
    
    if (!location || !location.longitude || !location.latitude) {
      return res.status(400).json({ 
        code: 400, 
        msg: "经纬度信息不能为空" 
      });
    }

    // 检查校区名称是否已存在
    const existingCampus = await Campus.findOne({ campusName });
    if (existingCampus) {
      return res.status(400).json({
        code: 400,
        msg: "校区名称已存在"
      });
    }

    // 创建校区对象
    const campusFields = {
      campusName,
      address,
      location: {
        longitude: location.longitude,
        latitude: location.latitude
      }
    };
    
    if (description) campusFields.description = description;
    if (status) campusFields.status = status;
    if (contactPhone) campusFields.contactPhone = contactPhone;
    if (contactEmail) campusFields.contactEmail = contactEmail;
    if (manager) campusFields.manager = manager;

    // 创建新校区
    const newCampus = new Campus(campusFields);
    const campus = await newCampus.save();

    res.json({
      code: 200,
      msg: "校区创建成功",
      data: campus
    });

  } catch (err) {
    console.error(err.message);
    
    // 处理特定的数据库错误
    if (err.code === 11000) {
      return res.status(400).json({
        code: 400,
        msg: "校区名称已存在"
      });
    }
    
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

/**
 * @route GET api/campus
 * @desc 获取所有校区
 * @access Public
 */
router.get("/", async (req, res) => {
  try {
    const campuses = await Campus.find().sort({ date: -1 });
    res.json({
      code: 200,
      msg: "校区获取成功",
      data: campuses
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
 * @route PUT api/campus/:id
 * @desc 更新校区信息
 * @access Private
 */
router.put("/:id", async (req, res) => {
  try {
    const {
      campusName,
      description,
      address,
      location,
      status,
      contactPhone,
      contactEmail,
      manager
    } = req.body;

    // 构建校区对象
    const campusFields = {};
    
    if (campusName) campusFields.campusName = campusName;
    if (description) campusFields.description = description;
    if (address) campusFields.address = address;
    if (location) {
      campusFields.location = {};
      if (location.longitude) campusFields.location.longitude = location.longitude;
      if (location.latitude) campusFields.location.latitude = location.latitude;
    }
    if (status) campusFields.status = status;
    if (contactPhone) campusFields.contactPhone = contactPhone;
    if (contactEmail) campusFields.contactEmail = contactEmail;
    if (manager) campusFields.manager = manager;

    // 检查校区是否存在
    let campus = await Campus.findById(req.params.id);
    
    if (!campus) {
      return res.status(404).json({ 
        code: 404,
        msg: "校区不存在" 
      });
    }
    
    // 如果要更新校区名称，检查是否重复
    if (campusName && campusName !== campus.campusName) {
      const existingCampus = await Campus.findOne({ campusName });
      if (existingCampus) {
        return res.status(400).json({
          code: 400,
          msg: "校区名称已存在"
        });
      }
    }
    
    // 更新校区
    campus = await Campus.findByIdAndUpdate(
      req.params.id,
      { $set: campusFields },
      { new: true }
    );
    
    res.json({
      code: 200,
      msg: "校区更新成功",
      data: campus
    });
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(400).json({
        code: 400,
        msg: "校区名称已存在"
      });
    }
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

/**
 * @route DELETE api/campus/:id
 * @desc 删除校区
 * @access Private
 */
router.delete("/:id", async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);
    
    if (!campus) {
      return res.status(404).json({ 
        code: 404,
        msg: "校区不存在" 
      });
    }
    
    // 检查是否有店铺关联此校区
    const Shop = require("../models/Shop");
    const relatedShops = await Shop.find({ campus: req.params.id });
    
    if (relatedShops.length > 0) {
      return res.status(400).json({
        code: 400,
        msg: `无法删除校区，还有 ${relatedShops.length} 个店铺关联此校区`
      });
    }
    
    await Campus.findByIdAndDelete(req.params.id);
    
    res.json({
      code: 200,
      msg: "校区删除成功",
      data: campus
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ 
        code: 404,
        msg: "校区不存在" 
      });
    }
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

/**
 * @route PUT api/campus/:id/status
 * @desc 更新校区状态
 * @access Private
 */
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !["1", "2"].includes(status)) {
      return res.status(400).json({
        code: 400,
        msg: "状态值无效，必须为1(启用)或2(禁用)"
      });
    }
    
    const campus = await Campus.findById(req.params.id);
    
    if (!campus) {
      return res.status(404).json({ 
        code: 404,
        msg: "校区不存在" 
      });
    }
    
    campus.status = status;
    await campus.save();
    
    res.json({
      code: 200,
      msg: `校区${status === "1" ? "启用" : "禁用"}成功`,
      data: campus
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ 
        code: 404,
        msg: "校区不存在" 
      });
    }
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

module.exports = router;
