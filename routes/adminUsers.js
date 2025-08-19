var express = require('express');
var router = express.Router();
const md5 = require('blueimp-md5')
const AdminUser = require("../models/AdminUser"); //引入模块模型
const DeliveryApplication = require("../models/DeliveryApplication");
const User = require("../models/User");
var vertoken = require('../utils/token') //引入token 
const mongoose = require("mongoose");
function randomString (e) {
    e = e || 32;
    var t = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678",
        a = t.length,
        n = "";
    for (i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
    return n
}
//注册接口
router.post('/register', (req, res) => {
    const newUser = new AdminUser({ // 用户传参
        username: req.body.username,
        password: md5(req.body.password),
        nickname: '超级管理员',
        avatar: 'https://picsum.photos/100/100?random=' + randomString(3),
    });
    const username = req.body.username;
    AdminUser.find({
        username: username
    }, (err, docs) => {
        if (docs.length > 0) {
            res.json({
                code: -1,
                message: '用户名已存在'
            })
        } else { // 向logins集合中保存数据
            console.log(newUser);
            newUser.save(err => {
                const datas = err ? {
                    code: -1,
                    message: '系统出错，攻城狮正在加急处理中...',
                    data: err.errors
                } : {
                    code: 200,
                    message: '注册成功'
                }
                res.json(datas);
            });
        }
    })
});
//用户名密码登录接口
router.post('/login', (req, res) => {
    const username = req.body.username;
    const password = md5(req.body.password);
    if (username == '') {
        res.status(404).json({
            code: 404,
            message: '用户名不能为空'
        })
        return false
    }

    AdminUser.find({ username: username }, (err, users) => {
        if (users.length === 0) {
            res.status(403).json({
                code: 403,
                message: '账户密码错误'
            });
        } else if (users[0].password === password) {
            vertoken.setToken(users[0]._id, users[0].username, users[0].huixinCode, users[0].nickname, users[0].avatar).then((token) => {
                res.status(200).json({
                    code: 200,
                    data:{
                        token: token
                    },
                    message: '登录成功'
                })
            })
        } else if (users[0].password !== password) {
            res.status(404).json({
                code: 404,
                message: '用户名或密码错误'
            });
        }
    });
})
//获取用户信息
router.get('/getInfo', (req, res) => {
    vertoken.getToken(req.headers.authorization).then((data) => {
        AdminUser.find({ _id: data._id }, (err, users) => {
            if (users.length === 0) {
                res.json({
                    code: -1,
                    data: {},
                    message: '该用户不存在'
                });
            } else {
                res.json({
                    code: 200,
                    data: users[0],
                    message: '查询成功'
                })
            }
        })
    }).catch((error) => {
        res.json({
            code: 401,
            message: "token失效了"
        })
    })

})

router.post('/test',(req,res)=>{
    res.json({
        code:200,
        success:true,
        message:"测试成功"
    })
})

/**
 * 获取待审核申请列表接口
 * GET /api/admin/applications
 * 
 * 查询参数:
 * - page: 页码，默认1
 * - limit: 每页数量，默认10
 * - applicationType: 申请类型筛选 (delivery | receiver)
 * - status: 状态筛选 (pending | approved | rejected)
 */
router.get('/applications', async (req, res) => {
  try {
    // 验证管理员token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const adminId = tokenData._id;
    
    // 验证是否为管理员
    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      return res.json({
        code: 401,
        message: '无管理员权限'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { applicationType, status } = req.query;
    
    // 构建查询条件
    const query = {};
    if (applicationType && ['delivery', 'receiver'].includes(applicationType)) {
      query.applicationType = applicationType;
    }
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }
    
    // 查询申请列表
    const skip = (page - 1) * limit;
    const applications = await DeliveryApplication.find(query)
      .populate('userId', 'nickname avatar phone')
      .populate('reviewerId', 'nickname')
      .sort({ createTime: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await DeliveryApplication.countDocuments(query);
    
    const formattedApplications = applications.map(app => ({
      applicationId: app._id,
      applicationType: app.applicationType,
      realName: app.realName,
      idNumber: app.idNumber,
      studentNumber: app.studentNumber,
      phone: app.phone,
      idCardFrontUrl: app.idCardFrontUrl,
      idCardBackUrl: app.idCardBackUrl,
      status: app.status,
      reviewComment: app.reviewComment,
      createTime: app.createTime,
      reviewTime: app.reviewTime,
      user: app.userId ? {
        userId: app.userId._id,
        nickname: app.userId.nickname,
        avatar: app.userId.avatar,
        userPhone: app.userId.phone
      } : null,
      reviewer: app.reviewerId ? {
        reviewerId: app.reviewerId._id,
        reviewerName: app.reviewerId.nickname
      } : null
    }));
    
    res.json({
      code: 200,
      message: '查询成功',
      data: {
        applications: formattedApplications,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('获取申请列表错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 审核申请接口
 * POST /api/admin/review-application
 * 
 * 请求参数:
 * - applicationId: 申请ID
 * - action: 审核动作 (approve | reject)
 * - reviewComment: 审核意见（可选）
 */
router.post('/review-application', async (req, res) => {
  try {
    // 验证管理员token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const adminId = tokenData._id;
    
    // 验证是否为管理员
    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      return res.json({
        code: 401,
        message: '无管理员权限'
      });
    }
    
    const { applicationId, action, reviewComment } = req.body;
    
    // 参数验证
    if (!applicationId || !action || !['approve', 'reject'].includes(action)) {
      return res.json({
        code: -1,
        message: '参数错误'
      });
    }
    
    // 查找申请记录
    const application = await DeliveryApplication.findById(applicationId);
    if (!application) {
      return res.json({
        code: -1,
        message: '申请记录不存在'
      });
    }
    
    // 检查申请状态
    if (application.status !== 'pending') {
      return res.json({
        code: -1,
        message: '该申请已被审核过'
      });
    }
    
    // 开始事务处理
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 更新申请状态
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      application.status = newStatus;
      application.reviewComment = reviewComment || '';
      application.reviewerId = adminId;
      application.reviewTime = new Date();
      
      await application.save({ session });
      
      // 如果审核通过，更新用户角色
      if (action === 'approve') {
        const user = await User.findById(application.userId).session(session);
        if (user) {
          if (application.applicationType === 'delivery') {
            user.isDelivery = true;
          } else if (application.applicationType === 'receiver') {
            user.isReceiver = true;
          }
          await user.save({ session });
        }
      }
      
      await session.commitTransaction();
      
      res.json({
        code: 200,
        message: `${action === 'approve' ? '审核通过' : '审核拒绝'}成功`,
        data: {
          applicationId: application._id,
          status: application.status,
          reviewTime: application.reviewTime
        }
      });
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('审核申请错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 获取申请详情接口
 * GET /api/admin/application/:id
 */
router.get('/application/:id', async (req, res) => {
  try {
    // 验证管理员token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const adminId = tokenData._id;
    
    // 验证是否为管理员
    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      return res.json({
        code: 401,
        message: '无管理员权限'
      });
    }
    
    const applicationId = req.params.id;
    
    // 查找申请详情
    const application = await DeliveryApplication.findById(applicationId)
      .populate('userId', 'nickname avatar phone openid')
      .populate('reviewerId', 'nickname');
    
    if (!application) {
      return res.json({
        code: -1,
        message: '申请记录不存在'
      });
    }
    
    const applicationDetail = {
      applicationId: application._id,
      applicationType: application.applicationType,
      realName: application.realName,
      idNumber: application.idNumber,
      studentNumber: application.studentNumber,
      phone: application.phone,
      idCardFrontUrl: application.idCardFrontUrl,
      idCardBackUrl: application.idCardBackUrl,
      status: application.status,
      reviewComment: application.reviewComment,
      createTime: application.createTime,
      reviewTime: application.reviewTime,
      user: application.userId ? {
        userId: application.userId._id,
        nickname: application.userId.nickname,
        avatar: application.userId.avatar,
        userPhone: application.userId.phone,
        openid: application.userId.openid
      } : null,
      reviewer: application.reviewerId ? {
        reviewerId: application.reviewerId._id,
        reviewerName: application.reviewerId.nickname
      } : null
    };
    
    res.json({
      code: 200,
      message: '查询成功',
      data: applicationDetail
    });
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('获取申请详情错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 同意申请接口
 * POST /api/admin/approve-application
 * 
 * 请求参数:
 * - applicationId: 申请ID
 * - reviewComment: 审核意见（可选）
 */
router.post('/approve-application', async (req, res) => {
  try {
    // 验证管理员token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const adminId = tokenData._id;
    
    // 验证是否为管理员
    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      return res.json({
        code: 401,
        message: '无管理员权限'
      });
    }
    
    const { applicationId, reviewComment } = req.body;
    
    // 参数验证
    if (!applicationId) {
      return res.json({
        code: -1,
        message: '申请ID不能为空'
      });
    }
    
    // 查找申请记录
    const application = await DeliveryApplication.findById(applicationId);
    if (!application) {
      return res.json({
        code: -1,
        message: '申请记录不存在'
      });
    }
    
    // 检查申请状态
    if (application.status !== 'pending') {
      return res.json({
        code: -1,
        message: '该申请已被审核过，无法重复审核'
      });
    }
    
    // 开始事务处理
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 更新申请状态为通过
      application.status = 'approved';
      application.reviewComment = reviewComment || '申请已通过';
      application.reviewerId = adminId;
      application.reviewTime = new Date();
      
      await application.save({ session });
      
      // 更新用户角色
      const user = await User.findById(application.userId).session(session);
      if (user) {
        if (application.applicationType === 'delivery') {
          user.isDelivery = true;
        } else if (application.applicationType === 'receiver') {
          user.isReceiver = true;
        }
        await user.save({ session });
      }
      
      await session.commitTransaction();
      
      res.json({
        code: 200,
        message: '申请审核通过成功',
        data: {
          applicationId: application._id,
          applicationType: application.applicationType,
          realName: application.realName,
          status: application.status,
          reviewComment: application.reviewComment,
          reviewTime: application.reviewTime,
          userUpdated: user ? {
            userId: user._id,
            isDelivery: user.isDelivery,
            isReceiver: user.isReceiver
          } : null
        }
      });
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('同意申请错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 拒绝申请接口
 * POST /api/admin/reject-application
 * 
 * 请求参数:
 * - applicationId: 申请ID
 * - reviewComment: 拒绝理由（建议填写）
 */
router.post('/reject-application', async (req, res) => {
  try {
    // 验证管理员token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const adminId = tokenData._id;
    
    // 验证是否为管理员
    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      return res.json({
        code: 401,
        message: '无管理员权限'
      });
    }
    
    const { applicationId, reviewComment } = req.body;
    
    // 参数验证
    if (!applicationId) {
      return res.json({
        code: -1,
        message: '申请ID不能为空'
      });
    }
    
    if (!reviewComment || reviewComment.trim() === '') {
      return res.json({
        code: -1,
        message: '拒绝申请时必须填写拒绝理由'
      });
    }
    
    // 查找申请记录
    const application = await DeliveryApplication.findById(applicationId);
    if (!application) {
      return res.json({
        code: -1,
        message: '申请记录不存在'
      });
    }
    
    // 检查申请状态
    if (application.status !== 'pending') {
      return res.json({
        code: -1,
        message: '该申请已被审核过，无法重复审核'
      });
    }
    
    // 更新申请状态为拒绝
    application.status = 'rejected';
    application.reviewComment = reviewComment;
    application.reviewerId = adminId;
    application.reviewTime = new Date();
    
    await application.save();
    
    res.json({
      code: 200,
      message: '申请已拒绝',
      data: {
        applicationId: application._id,
        applicationType: application.applicationType,
        realName: application.realName,
        status: application.status,
        reviewComment: application.reviewComment,
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
    
    console.error('拒绝申请错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 批量审核申请接口
 * POST /api/admin/batch-review-applications
 * 
 * 请求参数:
 * - applications: 申请列表
 *   - applicationId: 申请ID
 *   - action: 审核动作 (approve | reject)
 *   - reviewComment: 审核意见
 */
router.post('/batch-review-applications', async (req, res) => {
  try {
    // 验证管理员token
    const tokenData = await vertoken.getToken(req.headers.authorization);
    const adminId = tokenData._id;
    
    // 验证是否为管理员
    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      return res.json({
        code: 401,
        message: '无管理员权限'
      });
    }
    
    const { applications } = req.body;
    
    // 参数验证
    if (!applications || !Array.isArray(applications) || applications.length === 0) {
      return res.json({
        code: -1,
        message: '申请列表不能为空'
      });
    }
    
    // 验证每个申请的参数
    for (let app of applications) {
      if (!app.applicationId || !app.action || !['approve', 'reject'].includes(app.action)) {
        return res.json({
          code: -1,
          message: '申请参数格式错误'
        });
      }
      if (app.action === 'reject' && (!app.reviewComment || app.reviewComment.trim() === '')) {
        return res.json({
          code: -1,
          message: '拒绝申请时必须填写拒绝理由'
        });
      }
    }
    
    const results = [];
    const errors = [];
    
    // 开始事务处理
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      for (let appReview of applications) {
        try {
          // 查找申请记录
          const application = await DeliveryApplication.findById(appReview.applicationId).session(session);
          if (!application) {
            errors.push({
              applicationId: appReview.applicationId,
              error: '申请记录不存在'
            });
            continue;
          }
          
          // 检查申请状态
          if (application.status !== 'pending') {
            errors.push({
              applicationId: appReview.applicationId,
              error: '该申请已被审核过'
            });
            continue;
          }
          
          // 更新申请状态
          const newStatus = appReview.action === 'approve' ? 'approved' : 'rejected';
          application.status = newStatus;
          application.reviewComment = appReview.reviewComment || (appReview.action === 'approve' ? '申请已通过' : '申请已拒绝');
          application.reviewerId = adminId;
          application.reviewTime = new Date();
          
          await application.save({ session });
          
          // 如果是通过，更新用户角色
          if (appReview.action === 'approve') {
            const user = await User.findById(application.userId).session(session);
            if (user) {
              if (application.applicationType === 'delivery') {
                user.isDelivery = true;
              } else if (application.applicationType === 'receiver') {
                user.isReceiver = true;
              }
              await user.save({ session });
            }
          }
          
          results.push({
            applicationId: application._id,
            applicationType: application.applicationType,
            realName: application.realName,
            status: application.status,
            action: appReview.action
          });
          
        } catch (error) {
          errors.push({
            applicationId: appReview.applicationId,
            error: error.message
          });
        }
      }
      
      await session.commitTransaction();
      
      res.json({
        code: 200,
        message: `批量审核完成，成功处理 ${results.length} 个申请`,
        data: {
          successCount: results.length,
          errorCount: errors.length,
          results: results,
          errors: errors
        }
      });
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error) {
    if (error.error) {
      return res.json({
        code: 401,
        message: 'token失效了'
      });
    }
    
    console.error('批量审核申请错误:', error);
    res.json({
      code: -1,
      message: '服务器错误: ' + error.message
    });
  }
});

module.exports = router;