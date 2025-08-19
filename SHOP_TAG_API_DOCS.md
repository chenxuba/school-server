# 店铺标签和推荐功能 API 文档

## 概述

本文档描述了店铺系统新增的标签管理和推荐功能相关的 API 接口。

## 新增字段

### 店铺模型 (Shop) 新增字段

- `isRecommended`: Boolean - 是否推荐，默认为 false
- `tags`: Array[String] - 标签数组，存储标签名称

## API 接口

### 1. 店铺查询接口 (更新)

**GET** `/api/shop`

**新增查询参数:**
- `isRecommended`: String - 推荐状态筛选 ("true" 或 "false")

**示例:**
```
GET /api/shop?isRecommended=true
GET /api/shop?isRecommended=false
GET /api/shop?shopName=测试&isRecommended=true
```

### 2. 店铺推荐管理

#### 2.1 推荐店铺

**PUT** `/api/shop/:id/recommend`

**描述:** 将指定店铺设为推荐

**响应示例:**
```json
{
  "code": 200,
  "msg": "店铺推荐成功",
  "data": {
    "shopId": "60f1b2c3d4e5f6a7b8c9d0e1",
    "shopName": "测试店铺",
    "isRecommended": true
  }
}
```

#### 2.2 取消推荐店铺

**PUT** `/api/shop/:id/unrecommend`

**描述:** 取消指定店铺的推荐状态

**响应示例:**
```json
{
  "code": 200,
  "msg": "取消推荐成功",
  "data": {
    "shopId": "60f1b2c3d4e5f6a7b8c9d0e1",
    "shopName": "测试店铺",
    "isRecommended": false
  }
}
```

### 3. 标签管理

#### 3.1 获取标签列表

**GET** `/api/tag`

**查询参数:**
- `name`: String - 标签名称（模糊查询）
- `status`: String - 标签状态 ("1"-启用, "0"-禁用)

**响应示例:**
```json
{
  "code": 200,
  "msg": "标签获取成功",
  "data": [
    {
      "_id": "60f1b2c3d4e5f6a7b8c9d0e1",
      "name": "快餐",
      "description": "快餐类店铺",
      "color": "#1890ff",
      "status": "1",
      "sort": 10,
      "date": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 3.2 获取单个标签

**GET** `/api/tag/:id`

**响应示例:**
```json
{
  "code": 200,
  "msg": "标签获取成功",
  "data": {
    "_id": "60f1b2c3d4e5f6a7b8c9d0e1",
    "name": "快餐",
    "description": "快餐类店铺",
    "color": "#1890ff",
    "status": "1",
    "sort": 10,
    "date": "2023-01-01T00:00:00.000Z"
  }
}
```

#### 3.3 创建标签

**POST** `/api/tag`

**请求体:**
```json
{
  "name": "快餐",
  "description": "快餐类店铺",
  "color": "#1890ff",
  "sort": 10
}
```

**必填字段:**
- `name`: String - 标签名称（唯一）

**可选字段:**
- `description`: String - 标签描述
- `color`: String - 标签颜色（默认 "#1890ff"）
- `sort`: Number - 排序权重（默认 0）

**响应示例:**
```json
{
  "code": 200,
  "msg": "标签创建成功",
  "data": {
    "_id": "60f1b2c3d4e5f6a7b8c9d0e1",
    "name": "快餐",
    "description": "快餐类店铺",
    "color": "#1890ff",
    "status": "1",
    "sort": 10,
    "date": "2023-01-01T00:00:00.000Z"
  }
}
```

#### 3.4 更新标签

**PUT** `/api/tag/:id`

**请求体:**
```json
{
  "name": "快餐店",
  "description": "快餐类店铺更新",
  "color": "#ff6b6b",
  "status": "1",
  "sort": 20
}
```

**所有字段均为可选**

#### 3.5 删除标签

**DELETE** `/api/tag/:id`

**注意:** 如果有店铺正在使用该标签，将无法删除

**响应示例:**
```json
{
  "code": 200,
  "msg": "标签删除成功",
  "data": {
    "_id": "60f1b2c3d4e5f6a7b8c9d0e1",
    "name": "快餐",
    // ... 其他字段
  }
}
```

**使用中的标签删除失败:**
```json
{
  "code": 400,
  "msg": "该标签正在被 3 个店铺使用，无法删除"
}
```

#### 3.6 更新标签状态

**PUT** `/api/tag/:id/status`

**请求体:**
```json
{
  "status": "0"  // "1"-启用, "0"-禁用
}
```

### 4. 店铺创建和更新 (更新)

#### 4.1 创建店铺 (更新)

**POST** `/api/shop/create`

**新增字段:**
- `tags`: Array[String] - 标签名称数组

**请求体示例:**
```json
{
  "shopName": "测试店铺",
  "description": "测试描述",
  "tags": ["快餐", "外卖", "24小时"],
  // ... 其他字段
}
```

**标签验证:**
- 只能使用已存在且启用状态的标签
- 如果传入无效标签，将返回错误信息

#### 4.2 更新店铺 (更新)

**PUT** `/api/shop/:id`

**新增字段:**
- `tags`: Array[String] - 标签名称数组

**请求体示例:**
```json
{
  "shopName": "更新店铺名",
  "tags": ["快餐", "新标签"],
  // ... 其他字段
}
```

## 标签模型

### Tag Schema

```javascript
{
  name: String,        // 标签名称（必填，唯一）
  description: String, // 标签描述
  color: String,       // 标签颜色（默认 "#1890ff"）
  status: String,      // 状态 ("1"-启用, "0"-禁用，默认 "1")
  sort: Number,        // 排序权重（默认 0）
  date: Date          // 创建时间
}
```

## 错误处理

### 常见错误码

- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

### 错误示例

**标签名称已存在:**
```json
{
  "code": 400,
  "msg": "标签名称已存在"
}
```

**无效标签:**
```json
{
  "code": 400,
  "msg": "以下标签不存在或已禁用: 无效标签1, 无效标签2"
}
```

## 使用流程建议

1. **创建标签:** 先通过标签管理接口创建所需的标签
2. **创建店铺:** 在创建店铺时可以选择已创建的标签
3. **推荐管理:** 通过推荐接口管理店铺的推荐状态
4. **查询筛选:** 在查询店铺时可以按推荐状态进行筛选
5. **标签维护:** 定期维护标签，禁用或删除不再使用的标签
