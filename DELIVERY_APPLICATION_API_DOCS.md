# 配送员/接单员申请系统 API 文档

## 概述

本系统为学校配送平台提供配送员和接单员的申请、审核功能。用户可以提交申请资料，管理员可以审核申请并更新用户角色。

## 数据模型

### DeliveryApplication 申请表

```javascript
{
  userId: ObjectId,              // 申请用户ID
  applicationType: String,       // 申请类型：'delivery'(配送员) | 'receiver'(接单员)
  realName: String,              // 真实姓名
  idNumber: String,              // 身份证号
  studentNumber: String,         // 学号
  phone: String,                 // 手机号
  idCardFrontUrl: String,        // 身份证正面照片URL
  idCardBackUrl: String,         // 身份证反面照片URL
  status: String,                // 状态：'pending'(待审核) | 'approved'(已通过) | 'rejected'(已拒绝)
  reviewComment: String,         // 审核意见
  reviewerId: ObjectId,          // 审核人ID
  reviewTime: Date,              // 审核时间
  createTime: Date,              // 申请时间
  updateTime: Date               // 更新时间
}
```

## 用户端接口

### 1. 申请成为配送员

**接口地址：** `POST /api/user/apply-delivery`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "realName": "张三",
  "idNumber": "110101199001011234",
  "studentNumber": "2020001001",
  "phone": "13800138000",
  "idCardFrontUrl": "https://example.com/id-front.jpg",
  "idCardBackUrl": "https://example.com/id-back.jpg"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "配送员申请提交成功，请等待审核",
  "data": {
    "applicationId": "64f1234567890abcdef12345",
    "status": "pending",
    "createTime": "2024-01-01T12:00:00.000Z"
  }
}
```

### 2. 申请成为接单员

**接口地址：** `POST /api/user/apply-receiver`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "realName": "李四",
  "idNumber": "110101199001015678",
  "studentNumber": "2020001002",
  "phone": "13800138001",
  "idCardFrontUrl": "https://example.com/id-front.jpg",
  "idCardBackUrl": "https://example.com/id-back.jpg"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "接单员申请提交成功，请等待审核",
  "data": {
    "applicationId": "64f1234567890abcdef12346",
    "status": "pending",
    "createTime": "2024-01-01T12:00:00.000Z"
  }
}
```

### 3. 查询申请状态

**接口地址：** `POST /api/user/application-status`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "applicationType": "delivery"  // 或 "receiver"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "hasApplication": true,
    "applicationId": "64f1234567890abcdef12345",
    "status": "pending",
    "reviewComment": "",
    "createTime": "2024-01-01T12:00:00.000Z",
    "reviewTime": null
  }
}
```

### 4. 获取我的申请列表

**接口地址：** `POST /api/user/my-applications`

**请求头：**
```
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "code": 200,
  "message": "查询成功",
  "data": [
    {
      "applicationId": "64f1234567890abcdef12345",
      "applicationType": "delivery",
      "realName": "张三",
      "studentNumber": "2020001001",
      "phone": "13800138000",
      "status": "approved",
      "reviewComment": "资料齐全，审核通过",
      "createTime": "2024-01-01T12:00:00.000Z",
      "reviewTime": "2024-01-02T10:00:00.000Z"
    }
  ]
}
```

## 管理员端接口

### 1. 获取申请列表

**接口地址：** `GET /api/admin/applications`

**请求头：**
```
Authorization: Bearer <admin_token>
```

**查询参数：**
- `page`: 页码，默认1
- `limit`: 每页数量，默认10
- `applicationType`: 申请类型筛选 (delivery | receiver)
- `status`: 状态筛选 (pending | approved | rejected)

**示例：** `GET /api/admin/applications?page=1&limit=10&status=pending`

**响应示例：**
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "applications": [
      {
        "applicationId": "64f1234567890abcdef12345",
        "applicationType": "delivery",
        "realName": "张三",
        "idNumber": "110101199001011234",
        "studentNumber": "2020001001",
        "phone": "13800138000",
        "idCardFrontUrl": "https://example.com/id-front.jpg",
        "idCardBackUrl": "https://example.com/id-back.jpg",
        "status": "pending",
        "reviewComment": "",
        "createTime": "2024-01-01T12:00:00.000Z",
        "reviewTime": null,
        "user": {
          "userId": "64f1234567890abcdef12300",
          "nickname": "用户昵称",
          "avatar": "https://example.com/avatar.jpg",
          "userPhone": "13800138000"
        },
        "reviewer": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### 2. 审核申请

**接口地址：** `POST /api/admin/review-application`

**请求头：**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "applicationId": "64f1234567890abcdef12345",
  "action": "approve",  // "approve" 或 "reject"
  "reviewComment": "资料齐全，审核通过"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "审核通过成功",
  "data": {
    "applicationId": "64f1234567890abcdef12345",
    "status": "approved",
    "reviewTime": "2024-01-02T10:00:00.000Z"
  }
}
```

### 3. 获取申请详情

**接口地址：** `GET /api/admin/application/:id`

**请求头：**
```
Authorization: Bearer <admin_token>
```

**响应示例：**
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "applicationId": "64f1234567890abcdef12345",
    "applicationType": "delivery",
    "realName": "张三",
    "idNumber": "110101199001011234",
    "studentNumber": "2020001001",
    "phone": "13800138000",
    "idCardFrontUrl": "https://example.com/id-front.jpg",
    "idCardBackUrl": "https://example.com/id-back.jpg",
    "status": "approved",
    "reviewComment": "资料齐全，审核通过",
    "createTime": "2024-01-01T12:00:00.000Z",
    "reviewTime": "2024-01-02T10:00:00.000Z",
    "user": {
      "userId": "64f1234567890abcdef12300",
      "nickname": "用户昵称",
      "avatar": "https://example.com/avatar.jpg",
      "userPhone": "13800138000",
      "openid": "wx_openid_123"
    },
    "reviewer": {
      "reviewerId": "64f1234567890abcdef12400",
      "reviewerName": "管理员"
    }
  }
}
```

### 4. 同意申请

**接口地址：** `POST /api/admin/approve-application`

**请求头：**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "applicationId": "64f1234567890abcdef12345",
  "reviewComment": "资料齐全，审核通过"  // 可选
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "申请审核通过成功",
  "data": {
    "applicationId": "64f1234567890abcdef12345",
    "applicationType": "delivery",
    "realName": "张三",
    "status": "approved",
    "reviewComment": "资料齐全，审核通过",
    "reviewTime": "2024-01-02T10:00:00.000Z",
    "userUpdated": {
      "userId": "64f1234567890abcdef12300",
      "isDelivery": true,
      "isReceiver": false
    }
  }
}
```

### 5. 拒绝申请

**接口地址：** `POST /api/admin/reject-application`

**请求头：**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "applicationId": "64f1234567890abcdef12345",
  "reviewComment": "身份证照片不清晰，请重新上传"  // 必填
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "申请已拒绝",
  "data": {
    "applicationId": "64f1234567890abcdef12345",
    "applicationType": "delivery",
    "realName": "张三",
    "status": "rejected",
    "reviewComment": "身份证照片不清晰，请重新上传",
    "reviewTime": "2024-01-02T10:00:00.000Z"
  }
}
```

### 6. 批量审核申请

**接口地址：** `POST /api/admin/batch-review-applications`

**请求头：**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "applications": [
    {
      "applicationId": "64f1234567890abcdef12345",
      "action": "approve",
      "reviewComment": "资料齐全，审核通过"
    },
    {
      "applicationId": "64f1234567890abcdef12346",
      "action": "reject",
      "reviewComment": "身份证照片不清晰"
    }
  ]
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "批量审核完成，成功处理 2 个申请",
  "data": {
    "successCount": 2,
    "errorCount": 0,
    "results": [
      {
        "applicationId": "64f1234567890abcdef12345",
        "applicationType": "delivery",
        "realName": "张三",
        "status": "approved",
        "action": "approve"
      },
      {
        "applicationId": "64f1234567890abcdef12346",
        "applicationType": "receiver",
        "realName": "李四",
        "status": "rejected",
        "action": "reject"
      }
    ],
    "errors": []
  }
}
```

## 错误码说明

- `200`: 成功
- `-1`: 一般错误（参数错误、业务逻辑错误等）
- `401`: 认证失败（token失效或无权限）
- `404`: 资源不存在

## 业务逻辑说明

1. **申请限制**：
   - 同一用户同一类型只能有一个待审核的申请
   - 已经是对应角色的用户不能重复申请

2. **审核流程**：
   - 管理员审核通过后，自动更新用户的 `isDelivery` 或 `isReceiver` 字段
   - 使用数据库事务确保数据一致性

3. **数据验证**：
   - 身份证号格式验证
   - 手机号格式验证
   - 所有必填字段验证

4. **权限控制**：
   - 用户接口需要用户token
   - 管理员接口需要管理员token

## 数据库索引

系统自动创建复合索引确保同一用户同一类型只能有一个待审核申请：
```javascript
{ userId: 1, applicationType: 1, status: 1 }
```

## 注意事项

1. 身份证照片需要先通过文件上传接口上传，获得URL后再提交申请
2. 审核通过后用户角色立即生效
3. 申请记录会永久保存，便于追溯
4. 建议前端实现图片预览和压缩功能
