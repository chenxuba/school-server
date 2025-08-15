const express = require('express');
const router = express.Router();
const GoodsMenu = require('../models/GoodsMenu');
const ShopAccount = require('../models/ShopAccount');
const getToken = require('../utils/token').getToken;

// 验证token的中间件
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ success: false, message: '无权限访问，请先登录' });
    }
    
    const decoded = await getToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '无效的token，请重新登录' });
  }
};

/**
 * @route POST /api/goodsmenu/add
 * @desc 添加商品分类
 * @access Private
 */
router.post('/add', verifyToken, async (req, res) => {
  try {
    const { name, description, parentId, level, sort } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ success: false, message: '分类名称不能为空' });
    }

    // 从token中获取用户信息，然后获取shopId
    const shopAccount = await ShopAccount.findById(req.user._id);
    
    if (!shopAccount || !shopAccount.shop) {
      return res.status(400).json({ success: false, message: '未找到关联的店铺信息' });
    }

    // 创建新商品分类
    const newGoodsMenu = new GoodsMenu({
      name,
      description,
      parentId: parentId || null,
      level: level || 1,
      sort: sort || 0,
      shopId: shopAccount.shop
    });

    const goodsMenu = await newGoodsMenu.save();
    res.json({code:200, success: true, data: goodsMenu, message: '商品分类添加成功' });
  } catch (error) {
    console.error('添加商品分类失败', error);
    res.status(500).json({ success: false, message: '添加商品分类失败' });
  }
});

/**
 * @route GET /api/goodsmenu/list
 * @desc 获取商品分类列表
 * @access Private
 */
router.get('/list', verifyToken, async (req, res) => {
  try {
    const { parentId } = req.query;
    
    // 从token中获取用户信息，然后获取shopId
    const shopAccount = await ShopAccount.findById(req.user._id);
    
    if (!shopAccount || !shopAccount.shop) {
      return res.status(400).json({ success: false, message: '未找到关联的店铺信息' });
    }

    const query = { shopId: shopAccount.shop };
    if (parentId !== undefined) {
      query.parentId = parentId || null;
    }

    const goodsMenuList = await GoodsMenu.find(query).sort({ sort: 1, createTime: -1 });
    res.json({code:200, success: true, data: goodsMenuList });
  } catch (error) {
    console.error('获取商品分类列表失败', error);
    res.status(500).json({ success: false, message: '获取商品分类列表失败' });
  }
});

/**
 * @route GET /api/goodsmenu/tree
 * @desc 获取商品分类树形结构
 * @access Private
 */
router.get('/tree', verifyToken, async (req, res) => {
  try {
    // 从token中获取用户信息，然后获取shopId
    const shopAccount = await ShopAccount.findById(req.user._id);
    
    if (!shopAccount || !shopAccount.shop) {
      return res.status(400).json({ success: false, message: '未找到关联的店铺信息' });
    }

    // 获取所有分类
    const allCategories = await GoodsMenu.find({ shopId: shopAccount.shop }).sort({ sort: 1 });
    
    // 构建树形结构
    const rootCategories = allCategories.filter(cat => !cat.parentId);
    
    // 递归构建子分类
    const buildTree = (categories) => {
      return categories.map(category => {
        const children = allCategories.filter(cat => 
          cat.parentId && cat.parentId.toString() === category._id.toString()
        );
        
        const result = category.toObject();
        if (children.length > 0) {
          result.children = buildTree(children);
        }
        return result;
      });
    };

    const treeData = buildTree(rootCategories);
    res.json({code:200, success: true, data: treeData });
  } catch (error) {
    console.error('获取商品分类树形结构失败', error);
    res.status(500).json({ success: false, message: '获取商品分类树形结构失败' });
  }
});

/**
 * @route GET /api/goodsmenu/:id
 * @desc 获取单个商品分类详情
 * @access Private
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    // 从token中获取用户信息，然后获取shopId
    const shopAccount = await ShopAccount.findById(req.user._id);
    
    if (!shopAccount || !shopAccount.shop) {
      return res.status(400).json({ success: false, message: '未找到关联的店铺信息' });
    }

    const goodsMenu = await GoodsMenu.findOne({ 
      _id: req.params.id, 
      shopId: shopAccount.shop 
    });
    
    if (!goodsMenu) {
      return res.status(404).json({ success: false, message: '商品分类不存在' });
    }
    
    res.json({code:200, success: true, data: goodsMenu });
  } catch (error) {
    console.error('获取商品分类详情失败', error);
    res.status(500).json({ success: false, message: '获取商品分类详情失败' });
  }
});

/**
 * @route PUT /api/goodsmenu/:id
 * @desc 更新商品分类
 * @access Private
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, description, parentId, level, sort, isActive } = req.body;
    
    // 从token中获取用户信息，然后获取shopId
    const shopAccount = await ShopAccount.findById(req.user._id);
    
    if (!shopAccount || !shopAccount.shop) {
      return res.status(400).json({ success: false, message: '未找到关联的店铺信息' });
    }

    // 查找并更新商品分类
    const updateData = {
      name,
      description,
      parentId,
      level,
      sort,
      isActive,
      updateTime: Date.now()
    };
    
    // 移除未定义的字段
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );
    
    const goodsMenu = await GoodsMenu.findOneAndUpdate(
      { _id: req.params.id, shopId: shopAccount.shop },
      { $set: updateData },
      { new: true }
    );
    
    if (!goodsMenu) {
      return res.status(404).json({ success: false, message: '商品分类不存在' });
    }
    
    res.json({code:200, success: true, data: goodsMenu, message: '商品分类更新成功' });
  } catch (error) {
    console.error('更新商品分类失败', error);
    res.status(500).json({ success: false, message: '更新商品分类失败' });
  }
});

/**
 * @route DELETE /api/goodsmenu/:id
 * @desc 删除商品分类
 * @access Private
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // 从token中获取用户信息，然后获取shopId
    const shopAccount = await ShopAccount.findById(req.user._id);
    
    if (!shopAccount || !shopAccount.shop) {
      return res.status(400).json({ success: false, message: '未找到关联的店铺信息' });
    }

    // 首先验证该分类是否属于当前店铺
    const existingCategory = await GoodsMenu.findOne({ 
      _id: req.params.id, 
      shopId: shopAccount.shop 
    });

    if (!existingCategory) {
      return res.status(404).json({ success: false, message: '商品分类不存在' });
    }

    // 检查是否有子分类
    const childCategories = await GoodsMenu.find({ 
      parentId: req.params.id,
      shopId: shopAccount.shop 
    });
    
    if (childCategories.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '该分类下有子分类，请先删除子分类' 
      });
    }
    
    const goodsMenu = await GoodsMenu.findOneAndDelete({ 
      _id: req.params.id, 
      shopId: shopAccount.shop 
    });
    
    res.json({code:200, success: true, message: '商品分类删除成功' });
  } catch (error) {
    console.error('删除商品分类失败', error);
    res.status(500).json({ success: false, message: '删除商品分类失败' });
  }
});

module.exports = router;
