const express = require("express");
const router = express.Router();
const Tag = require("../models/Tag");

/**
 * @route GET api/tag
 * @desc 获取标签列表，支持按名称筛选
 * @access Public
 * @query name - 标签名称（模糊查询）
 * @query status - 标签状态（1-启用，0-禁用）
 */
router.get("/", async (req, res) => {
  try {
    const { name, status } = req.query;
    
    // 构建查询条件
    let query = {};
    
    // 按标签名称模糊查询
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    
    // 按状态查询
    if (status) {
      query.status = status;
    }
    
    const tags = await Tag.find(query)
      .sort({ sort: -1, date: -1 });
      
    res.json({
      code: 200,
      msg: "标签获取成功",
      data: tags
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
 * @route POST api/tag
 * @desc 创建标签
 * @access Private
 */
router.post("/", async (req, res) => {
  try {
    const { name, description, color, sort } = req.body;

    // 检查必填字段
    if (!name) {
      return res.status(400).json({ 
        code: 400, 
        msg: "标签名称不能为空" 
      });
    }

    // 检查标签名称是否已存在
    const existingTag = await Tag.findOne({ name });
    if (existingTag) {
      return res.status(400).json({
        code: 400,
        msg: "标签名称已存在"
      });
    }

    // 构建标签对象
    const tagFields = {
      name,
    };
    
    if (description) tagFields.description = description;
    if (color) tagFields.color = color;
    if (sort !== undefined) tagFields.sort = sort;

    // 创建新标签
    const newTag = new Tag(tagFields);
    const tag = await newTag.save();

    res.json({
      code: 200,
      msg: "标签创建成功",
      data: tag
    });

  } catch (err) {
    console.error(err.message);
    
    // 处理重复键错误
    if (err.code === 11000) {
      return res.status(400).json({
        code: 400,
        msg: "标签名称已存在"
      });
    }
    
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

/**
 * @route PUT api/tag/:id
 * @desc 更新标签信息
 * @access Private
 */
router.put("/:id", async (req, res) => {
  try {
    const { name, description, color, status, sort } = req.body;

    // 构建标签对象
    const tagFields = {};
    
    if (name) {
      // 检查标签名称是否已被其他标签使用
      const existingTag = await Tag.findOne({ 
        name, 
        _id: { $ne: req.params.id } 
      });
      if (existingTag) {
        return res.status(400).json({
          code: 400,
          msg: "标签名称已存在"
        });
      }
      tagFields.name = name;
    }
    
    if (description !== undefined) tagFields.description = description;
    if (color) tagFields.color = color;
    if (status) tagFields.status = status;
    if (sort !== undefined) tagFields.sort = sort;

    // 更新标签
    let tag = await Tag.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ 
        code: 404,
        msg: "标签不存在" 
      });
    }
    
    tag = await Tag.findByIdAndUpdate(
      req.params.id,
      { $set: tagFields },
      { new: true }
    );
    
    res.json({
      code: 200,
      msg: "标签更新成功",
      data: tag
    });
  } catch (err) {
    console.error(err.message);
    
    // 处理重复键错误
    if (err.code === 11000) {
      return res.status(400).json({
        code: 400,
        msg: "标签名称已存在"
      });
    }
    
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

/**
 * @route DELETE api/tag/:id
 * @desc 删除标签
 * @access Private
 */
router.delete("/:id", async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ 
        code: 404,
        msg: "标签不存在" 
      });
    }
    
    // 检查是否有店铺在使用这个标签
    const Shop = require("../models/Shop");
    const shopsUsingTag = await Shop.find({ tags: tag.name });
    
    if (shopsUsingTag.length > 0) {
      return res.status(400).json({
        code: 400,
        msg: `该标签正在被 ${shopsUsingTag.length} 个店铺使用，无法删除`
      });
    }
    
    await Tag.findByIdAndDelete(req.params.id);
    
    res.json({
      code: 200,
      msg: "标签删除成功",
      data: tag
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ 
        code: 404,
        msg: "标签不存在" 
      });
    }
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

/**
 * @route PUT api/tag/:id/status
 * @desc 更新标签状态
 * @access Private
 */
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !["0", "1"].includes(status)) {
      return res.status(400).json({
        code: 400,
        msg: "状态值无效，必须是0或1"
      });
    }

    const tag = await Tag.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ 
        code: 404,
        msg: "标签不存在" 
      });
    }
    
    tag.status = status;
    await tag.save();
    
    res.json({
      code: 200,
      msg: status === "1" ? "标签启用成功" : "标签禁用成功",
      data: {
        tagId: tag._id,
        name: tag.name,
        status: tag.status
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ 
        code: 404,
        msg: "标签不存在" 
      });
    }
    res.status(500).json({
      code: 500,
      msg: "服务器错误"
    });
  }
});

module.exports = router;
