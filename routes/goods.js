const express = require('express');
const router = express.Router();
const Goods = require('../models/Goods');
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
 * @route   POST /api/goods
 * @desc    创建新商品
 * @access  Private
 */
router.post('/create', verifyToken, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      images,
      thumbnail,
      stock,
      status,
      menuId,
      isRecommend
    } = req.body;

    // 验证必填字段
    if (!name || !price || !menuId) {
      return res.status(400).json({ success: false, message: '请提供必要的商品信息' });
    }

    // 从token中获取用户信息，再获取shopId
    const shopAccount = await ShopAccount.findById(req.user._id).populate('shop');
    if (!shopAccount || !shopAccount.shop) {
      return res.status(400).json({ success: false, message: '未找到关联的店铺信息' });
    }

    const shopId = shopAccount.shop._id;

    // 创建新商品
    const newGoods = new Goods({
      name,
      description,
      price,
      originalPrice,
      images,
      thumbnail,
      stock,
      status,
      menuId,
      shopId,
      isRecommend
    });

    const goods = await newGoods.save();
    res.json({ code:200,success: true, data: goods, message: '商品创建成功' });
  } catch (error) {
    console.error('创建商品失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，创建商品失败' });
  }
});

/**
 * @route   GET /api/goods/by-shop
 * @desc    获取当前店铺的分类及商品列表
 * @access  Private
 */
router.get('/by-shop', verifyToken, async (req, res) => {
  try {
    const { status = 1 } = req.query;
    
    // 从token中获取用户信息，再获取shopId
    const shopAccount = await ShopAccount.findById(req.user._id).populate('shop');
    if (!shopAccount || !shopAccount.shop) {
      return res.status(400).json({ success: false, message: '未找到关联的店铺信息' });
    }

    const shopId = shopAccount.shop._id;

    // 查询该店铺下的所有分类
    const GoodsMenu = require('../models/GoodsMenu');
    const categories = await GoodsMenu.find({ 
      shopId,
      isActive: true,
      parentId: null // 只获取一级分类
    }).sort({ sort: 1 });

    // 构建结果数据
    const result = [];
    
    // 对每个分类，查询其下的商品
    for (const category of categories) {
      // 查询该分类下的所有商品
      const goodsList = await Goods.find({
        shopId,
        menuId: category._id,
        status
      }).sort('-createTime');
      
      // 添加到结果中
      result.push({
        categoryId: category._id,
        categoryName: category.name,
        categoryDescription: category.description,
        goods: goodsList
      });
    }
    
    res.json({
      code:200,
      success: true,
      data: result,
      message: '获取店铺商品分类列表成功'
    });
  } catch (error) {
    console.error('获取店铺商品分类列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，获取店铺商品分类列表失败' });
  }
});

/**
 * @route   GET /api/goods/:id
 * @desc    获取单个商品详情
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const goods = await Goods.findById(req.params.id)
      .populate('menuId', 'name')
      .populate('shopId', 'shopName');
    
    if (!goods) {
      return res.status(404).json({ success: false, message: '未找到该商品' });
    }
    
    res.json({ code:200, success: true, data: goods, message: '获取商品详情成功' });
  } catch (error) {
    console.error('获取商品详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，获取商品详情失败' });
  }
});

/**
 * @route   PUT /api/goods/:id
 * @desc    更新商品信息
 * @access  Private
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      images,
      thumbnail,
      stock,
      status,
      menuId,
      isRecommend
    } = req.body;

    // 更新时间
    req.body.updateTime = Date.now();

    // 查找并更新商品
    const goods = await Goods.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!goods) {
      return res.status(404).json({ success: false, message: '未找到该商品' });
    }

    res.json({ code:200, success: true, data: goods, message: '商品更新成功' });
  } catch (error) {
    console.error('更新商品失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，更新商品失败' });
  }
});

/**
 * @route   DELETE /api/goods/:id
 * @desc    删除商品
 * @access  Private
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const goods = await Goods.findByIdAndRemove(req.params.id);
    
    if (!goods) {
      return res.status(404).json({ success: false, message: '未找到该商品' });
    }
    
    res.json({ code:200, success: true, message: '商品删除成功' });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，删除商品失败' });
  }
});

/**
 * @route   PUT /api/goods/:id/status
 * @desc    更新商品状态（上架/下架）
 * @access  Private
 */
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (status === undefined) {
      return res.status(400).json({ success: false, message: '请提供商品状态' });
    }
    
    const goods = await Goods.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          status,
          updateTime: Date.now() 
        } 
      },
      { new: true }
    );
    
    if (!goods) {
      return res.status(404).json({ success: false, message: '未找到该商品' });
    }
    
    const statusText = status === 1 ? '上架' : '下架';
    res.json({ code:200, success: true, data: goods, message: `商品${statusText}成功` });
  } catch (error) {
    console.error('更新商品状态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，更新商品状态失败' });
  }
});

/**
 * @route   PUT /api/goods/:id/recommend
 * @desc    设置/取消推荐商品
 * @access  Private
 */
router.put('/:id/recommend', verifyToken, async (req, res) => {
  try {
    const { isRecommend } = req.body;
    
    if (isRecommend === undefined) {
      return res.status(400).json({ success: false, message: '请提供推荐状态' });
    }
    
    const goods = await Goods.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          isRecommend,
          updateTime: Date.now() 
        } 
      },
      { new: true }
    );
    
    if (!goods) {
      return res.status(404).json({ success: false, message: '未找到该商品' });
    }
    
    const recommendText = isRecommend ? '设为推荐' : '取消推荐';
    res.json({ code:200, success: true, data: goods, message: `商品${recommendText}成功` });
  } catch (error) {
    console.error('更新商品推荐状态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，更新商品推荐状态失败' });
  }
});

/**
 * @route   PUT /api/goods/:id/stock
 * @desc    更新商品库存
 * @access  Private
 */
router.put('/:id/stock', verifyToken, async (req, res) => {
  try {
    const { stock } = req.body;
    
    if (stock === undefined) {
      return res.status(400).json({ success: false, message: '请提供库存数量' });
    }
    
    const goods = await Goods.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          stock,
          updateTime: Date.now() 
        } 
      },
      { new: true }
    );
    
    if (!goods) {
      return res.status(404).json({ success: false, message: '未找到该商品' });
    }
    
    res.json({ code:200, success: true, data: goods, message: '商品库存更新成功' });
  } catch (error) {
    console.error('更新商品库存失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，更新商品库存失败' });
  }
});

/**
 * @route   GET /api/goods/shop/all
 * @desc    获取店铺所有商品列表
 * @access  Private
 */
router.get('/shop/all', verifyToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      isRecommend, 
      menuId,
      name,
      sortBy = 'createTime',
      sortOrder = 'desc'
    } = req.query;

    // 从token中获取用户信息，再获取shopId
    const shopAccount = await ShopAccount.findById(req.user._id).populate('shop');
    if (!shopAccount || !shopAccount.shop) {
      return res.status(400).json({ success: false, message: '未找到关联的店铺信息' });
    }

    const shopId = shopAccount.shop._id;

    // 构建查询条件
    const query = { shopId };
    
    // 可选的过滤条件
    if (status !== undefined) {
      query.status = parseInt(status);
    }
    if (isRecommend !== undefined) {
      query.isRecommend = isRecommend === 'true';
    }
    if (menuId) {
      query.menuId = menuId;
    }
    if (name) {
      query.name = new RegExp(name, 'i'); // 不区分大小写的模糊搜索
    }

    // 构建排序条件
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 计算分页
    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNum - 1) * pageSize;

    // 查询商品总数
    const total = await Goods.countDocuments(query);

    // 查询商品列表
    const goodsList = await Goods.find(query)
      .populate('menuId', 'name')
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize);

    // 处理返回数据，拆分menuId
    const processedGoodsList = goodsList.map(goods => {
      const goodsObj = goods.toObject();
      // 拆分menuId
      if (goodsObj.menuId) {
        goodsObj.menuName = goodsObj.menuId.name;
        goodsObj.menuId = goodsObj.menuId._id;
      }
      return goodsObj;
    });

    // 计算分页信息
    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      code:200,
      success: true,
      data: {
        goods: processedGoodsList,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: pageSize,
          hasNextPage,
          hasPrevPage
        }
      },
      message: '获取店铺商品列表成功'
    });
  } catch (error) {
    console.error('获取店铺商品列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误，获取店铺商品列表失败' });
  }
});

module.exports = router;
