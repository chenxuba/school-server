# 微信小程序用户接口文档

## 1. 手机号登录接口

### 接口地址
`POST /api/user/phone-login`

### 请求参数
```json
{
  "wxSmallCode": "string",     // 微信小程序登录code
  "iv": "string",              // 手机号加密算法的初始向量
  "encryptedData": "string",   // 包括手机号在内的完整用户信息的加密数据
  "loginType": "phone",        // 登录类型，固定为'phone'
  "invite": "string"           // 可选，推荐码
}
```

### 响应示例
```json
{
  "code": 200,
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "_id": "用户ID",
    "openid": "微信openid",
    "phone": "手机号",
    "nickname": "昵称",
    "avatar": "头像URL",
    "gender": 0,
    "city": "城市",
    "province": "省份",
    "country": "国家",
    "inviteCode": "邀请码",
    "isProfileComplete": false,
    "createTime": "2024-01-01T00:00:00.000Z"
  },
  "nullUserInfo": true  // 是否需要完善用户信息
}
```

### 前端调用示例
```javascript
function phoneLogin(phoneDetail, callback) {
    if (loginStart) {
        loginStart = false;
        
        // 获取微信登录code
        uni.login({
            provider: 'weixin',
            success: function(loginRes) {
                if (loginRes.errMsg === 'login:ok') {
                    let httpData = {
                        wxSmallCode: loginRes.code,
                        iv: phoneDetail.iv,
                        encryptedData: phoneDetail.encryptedData,
                        loginType: 'phone'
                    };
                    
                    // 推荐码处理
                    if(store.state.chatScenesInfo.invite){
                        httpData.invite = store.state.chatScenesInfo.invite;
                    }
                    
                    // 调用手机号登录接口
                    $http.post('api/user/phone-login', httpData).then(res => {
                        loginStart = true;
                        store.commit('setUserInfo', res);
                        callback && callback(res);
                        
                        if (res.nullUserInfo) {
                            // 需要完善用户信息
                            store.commit('setBindUserInfoShow', true);
                        } else {
                            uni.showToast({
                                title: "登录成功",
                                icon: 'success'
                            });
                        }
                    }, err => {
                        loginStart = true;
                        callback && callback(null, err);
                    });
                }
            }
        });
    }
}
```

## 2. 完善用户信息接口

### 接口地址
`POST /api/user/update-profile`

### 请求头
```
Authorization: Bearer <token>
```

### 请求参数
```json
{
  "nickname": "string",    // 昵称
  "avatar": "string",      // 头像URL
  "gender": 1,             // 可选，性别 (0: 未知, 1: 男, 2: 女)
  "city": "string",        // 可选，城市
  "province": "string",    // 可选，省份
  "country": "string"      // 可选，国家
}
```

### 响应示例
```json
{
  "code": 200,
  "message": "用户信息更新成功",
  "token": "新的token",
  "data": {
    "_id": "用户ID",
    "openid": "微信openid",
    "phone": "手机号",
    "nickname": "昵称",
    "avatar": "头像URL",
    "gender": 1,
    "city": "城市",
    "province": "省份",
    "country": "国家",
    "inviteCode": "邀请码",
    "isProfileComplete": true,
    "createTime": "2024-01-01T00:00:00.000Z"
  }
}
```

## 3. 获取用户信息接口

### 接口地址
`POST /api/user/info`

### 请求头
```
Authorization: Bearer <token>
```

### 响应示例
```json
{
  "code": 200,
  "message": "获取用户信息成功",
  "data": {
    "_id": "用户ID",
    "openid": "微信openid",
    "phone": "手机号",
    "nickname": "昵称",
    "avatar": "头像URL",
    "gender": 1,
    "city": "城市",
    "province": "省份",
    "country": "国家",
    "inviteCode": "邀请码",
    "isProfileComplete": true,
    "createTime": "2024-01-01T00:00:00.000Z"
  }
}
```

## 4. 查询邀请码接口

### 接口地址
`GET /api/user/invite/:code`

### 路径参数
- `code`: 邀请码

### 响应示例
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "nickname": "邀请人昵称",
    "avatar": "邀请人头像",
    "inviteCode": "邀请码"
  }
}
```

## 错误码说明

- `200`: 成功
- `-1`: 业务错误（具体错误信息在message中）
- `401`: token失效

## 配置说明

### 1. 微信小程序配置
在 `config/wxConfig.js` 中配置你的微信小程序AppID和AppSecret：

```javascript
module.exports = {
  appId: 'your_wx_mini_app_id',
  appSecret: 'your_wx_mini_app_secret'
};
```

### 2. 环境变量配置（推荐）
```bash
export WX_MINI_APP_ID=your_actual_app_id
export WX_MINI_APP_SECRET=your_actual_app_secret
export DEEPSEEK_API_KEY=your_deepseek_key
export DEEPSEEK_BASE_URL=https://api.deepseek.com
export DEEPSEEK_MODEL=deepseek-chat
```

## AI 接口

### 接口地址
`POST /api/ai/chat`

### 请求参数
```json
{
  "messages": [
    { "role": "system", "content": "你是一个有用的助手" },
    { "role": "user", "content": "帮我写一段欢迎词" }
  ],
  "model": "deepseek-chat",
  "stream": false
}
```

### 参数说明
- `messages`: 对话消息数组，必需
- `model`: 模型名称，可选，默认为 `deepseek-chat`
- `stream`: 是否启用流式输出，可选，默认为 `false`

### 非流式响应示例
```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "model": "deepseek-chat",
    "id": "cmpl-xxx",
    "content": "欢迎使用本系统！..."
  }
}
```

### 流式输出
当 `stream: true` 时，响应为纯文本流，Content-Type 为 `text/plain; charset=utf-8`

### 前端调用示例

#### 非流式调用
```javascript
fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: '你好' }
    ],
    stream: false
  })
})
.then(response => response.json())
.then(data => {
  console.log(data.data.content);
});
```

#### 流式调用
```javascript
fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: '请写一个故事' }
    ],
    stream: true
  })
})
.then(response => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  function readStream() {
    return reader.read().then(({ done, value }) => {
      if (done) return;
      
      const chunk = decoder.decode(value);
      console.log(chunk); // 实时输出内容
      
      return readStream();
    });
  }
  
  return readStream();
});
```

## 数据库模型

用户表字段说明：
- `openid`: 微信openid（必填，唯一）
- `unionid`: 微信unionid（可选）
- `phone`: 手机号
- `nickname`: 昵称
- `avatar`: 头像URL
- `gender`: 性别 (0: 未知, 1: 男, 2: 女)
- `city`: 城市
- `province`: 省份
- `country`: 国家
- `inviteCode`: 邀请码（自动生成，唯一）
- `invitedBy`: 邀请人ID
- `status`: 用户状态 (1: 正常, 0: 禁用)
- `isProfileComplete`: 是否完善了用户信息
- `lastLoginTime`: 最后登录时间
- `createTime`: 创建时间
- `updateTime`: 更新时间
