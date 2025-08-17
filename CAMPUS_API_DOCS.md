# 校区管理 API 文档

## 校区相关接口

### 1. 创建校区
- **URL**: `POST /api/campus/create`
- **描述**: 创建新的校区
- **请求体**:
```json
{
  "campusName": "校区名称（必填）",
  "description": "校区描述（可选）",
  "address": "校区地址（必填）",
  "location": {
    "longitude": 116.4074,
    "latitude": 39.9042
  },
  "status": "1",
  "contactPhone": "联系电话（可选）",
  "contactEmail": "联系邮箱（可选）",
  "manager": "管理员（可选）"
}
```
- **响应**:
```json
{
  "code": 200,
  "msg": "校区创建成功",
  "data": { "校区信息对象" }
}
```

### 2. 获取所有校区
- **URL**: `GET /api/campus`
- **描述**: 获取所有校区列表
- **响应**:
```json
{
  "code": 200,
  "msg": "校区获取成功",
  "data": ["校区数组"]
}
```

### 3. 获取启用状态的校区
- **URL**: `GET /api/campus/active`
- **描述**: 获取所有启用状态的校区
- **响应**:
```json
{
  "code": 200,
  "msg": "启用校区获取成功",
  "data": ["启用校区数组"]
}
```

### 4. 根据ID获取校区
- **URL**: `GET /api/campus/:id`
- **描述**: 根据校区ID获取校区详情
- **响应**:
```json
{
  "code": 200,
  "msg": "校区获取成功",
  "data": { "校区信息对象" }
}
```

### 5. 更新校区信息
- **URL**: `PUT /api/campus/:id`
- **描述**: 更新校区信息
- **请求体**: 与创建校区相同，所有字段都是可选的
- **响应**:
```json
{
  "code": 200,
  "msg": "校区更新成功",
  "data": { "更新后的校区信息对象" }
}
```

### 6. 删除校区
- **URL**: `DELETE /api/campus/:id`
- **描述**: 删除校区（如果有店铺关联则无法删除）
- **响应**:
```json
{
  "code": 200,
  "msg": "校区删除成功",
  "data": { "被删除的校区信息对象" }
}
```

### 7. 更新校区状态
- **URL**: `PUT /api/campus/:id/status`
- **描述**: 更新校区启用/禁用状态
- **请求体**:
```json
{
  "status": "1" // 1: 启用, 2: 禁用
}
```
- **响应**:
```json
{
  "code": 200,
  "msg": "校区启用成功",
  "data": { "校区信息对象" }
}
```

## 店铺相关接口更新

### 1. 创建店铺（已更新）
- **URL**: `POST /api/shop/create`
- **描述**: 创建店铺时必须关联校区ID
- **新增字段**:
  - `campusId`: 校区ID（必填）
  - `location`: 经纬度信息（可选）
    - `longitude`: 经度
    - `latitude`: 纬度

### 2. 根据校区获取店铺
- **URL**: `GET /api/shop/campus/:campusId`
- **描述**: 根据校区ID获取该校区的所有店铺
- **响应**:
```json
{
  "code": 200,
  "msg": "校区店铺获取成功",
  "data": {
    "campus": { "校区信息对象" },
    "shops": ["店铺数组"],
    "total": 10
  }
}
```

### 3. 获取店铺详情（已更新）
- **URL**: `GET /api/shop/:id`
- **描述**: 获取店铺详情，现在会包含校区信息和经纬度
- **响应**: 店铺对象现在包含 `campus` 和 `location` 字段

## 数据模型更新

### 校区模型 (Campus)
```javascript
{
  campusName: String, // 校区名称（必填）
  description: String, // 描述
  address: String, // 地址（必填）
  location: {
    longitude: Number, // 经度（必填）
    latitude: Number   // 纬度（必填）
  },
  status: String, // 状态：1-启用，2-禁用
  contactPhone: String, // 联系电话
  contactEmail: String, // 联系邮箱
  manager: String, // 管理员
  date: Date // 创建时间
}
```

### 店铺模型更新 (Shop)
```javascript
{
  // ... 原有字段
  location: {
    longitude: Number, // 经度
    latitude: Number   // 纬度
  },
  campus: ObjectId, // 关联校区ID（必填）
  // ... 其他字段
}
```

## 状态码说明
- `200`: 操作成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误
