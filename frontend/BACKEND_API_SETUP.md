# 后端 API 对接说明

前端已从 Mock API 切换到真实后端 API。

## 配置后端地址

编辑 `.env.local` 文件，设置后端服务器地址：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

将 `http://localhost:3000/api` 替换为你的实际后端地址（默认端口 3000）。

## 后端 API 接口说明

前端已适配以下后端 API 接口：

### 1. 系统初始化

#### 检查初始化状态
```
GET /api/init-status

Response:
{
  "success": true,
  "initialized": false
}
```

#### 初始化管理员账户
```
POST /api/init-admin
Content-Type: application/json

Request:
{
  "username": "admin",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "系统初始化成功",
  "userId": 1
}
```

**注意**：此接口仅在系统未初始化时有效。初始化后，将无法再次调用。

### 2. 用户认证

#### 登录
```
POST /api/login
Content-Type: application/json

Request:
{
  "username": "admin",
  "password": "password"
}

Response:
{
  "success": true,
  "message": "登录成功",
  "data": {
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

#### 获取当前用户
```
GET /api/users/profile
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "created_at": "2024-03-05T10:00:00Z"
  }
}
```

### 2. 文件管理

#### 获取文件列表
```
GET /api/audio-files
Authorization: Bearer {accessToken}

Query Parameters:
- page: 页码（默认 1）
- size: 每页数量（默认 10）

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "filename": "audio-1234567890.mp3",
      "original_name": "recording.mp3",
      "mimetype": "audio/mpeg",
      "size": 5242880,
      "upload_time": "2024-03-05T10:30:00Z",
      "user_id": 1,
      "risk_level": "高风险",
      "confidence": 0.85
    }
  ],
  "total": 1
}
```

#### 上传文件
```
POST /api/upload-audio
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

Request:
FormData with "audio" field（注意字段名是 "audio" 不是 "file"）

Response:
{
  "success": true,
  "message": "音频文件上传成功",
  "file": {
    "filename": "audio-1234567890.mp3",
    "originalName": "recording.mp3",
    "mimetype": "audio/mpeg",
    "size": 5242880
  }
}
```

#### 删除文件
```
DELETE /api/audio-files/{id}
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "message": "删除成功"
}
```

#### 获取文件处理状态
```
GET /api/audio-processing-status/{filename}
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "status": "completed",
    "progress": 100,
    "message": "处理完成",
    "result": {
      "risk_level": "高风险",
      "confidence": 0.85
    }
  }
}
```

## 数据字段说明

### AudioFile 对象
```typescript
{
  id: number;              // 数字类型 ID
  filename: string;        // 服务器文件名
  original_name: string;   // 原始文件名
  mimetype: string;        // MIME 类型
  size: number;           // 文件大小（字节）
  upload_time: string;    // 上传时间（ISO 8601）
  user_id: number;        // 用户 ID（数字）
  risk_level: RiskLevel; // 风险等级
  confidence: number;     // 置信度（0-1）
  // status 字段由前端根据 risk_level 动态计算，后端不返回
}
```

### 风险等级枚举
`risk_level` 字段必须是以下之一：
- `"高风险"`
- `"中风险"`
- `"低风险"`
- `"未检测"` - 表示文件尚未处理

### 处理状态说明
前端根据 `risk_level` 自动计算 `status`：
- `"未检测"` → `status = "processing"`（处理中）
- `"高风险"`/`"中风险"`/`"低风险"` → `status = "completed"`（已完成）

## 错误处理

API 错误响应格式：

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

前端会根据 HTTP 状态码和错误信息显示相应的提示。

## 跨域 (CORS) 配置

后端已配置 CORS，允许来自前端域名（如 `http://localhost:9002`）的请求。

## 重要说明

1. **端口配置**：后端默认运行在 3000 端口，前端默认运行在 9002 端口
2. **上传字段名**：上传文件时使用 `audio` 字段名（不是 `file`）
3. **状态轮询**：前端每 5 秒轮询一次文件列表，通过 `/api/audio-processing-status/{filename}` 检查处理状态
4. **ID 类型**：所有 ID 字段都是数字类型，不是字符串

## 修改后的文件

已修改的文件：
- `src/lib/api.ts` - 适配后端接口格式
- `src/lib/mock-api.ts` - 保留，但不再使用
- `src/app/page.tsx` - 登录页面
- `src/app/dashboard/page.tsx` - 仪表板页面，添加状态轮询
- `src/app/profile/page.tsx` - 用户设置页面
- `.env.local` - 配置后端地址

## 测试步骤

1. **启动后端服务器**（端口 3000）
2. **启动前端**：`npm run dev`（端口 9002）
3. **首次使用 - 系统初始化**：
   - 打开前端登录页面
   - 页面会自动检测系统初始化状态
   - 如果是首次使用，会显示"系统初始化"界面
   - 输入管理员用户名和密码（密码至少 6 位）
   - 点击"创建管理员"按钮
4. **后续使用 - 登录**：
   - 使用创建的管理员账户登录
   - 进入仪表板测试其他功能
5. **测试功能**：
   - 上传音频文件
   - 查看 AI 分析结果（等待处理完成）
   - 删除文件
   - 修改密码

## 使用说明

### 首次使用流程

1. 启动后端服务器
2. 访问前端登录页面（`http://localhost:9002`）
3. 系统自动检测到未初始化，显示"系统初始化"界面
4. 创建管理员账户（用户名：admin，密码：admin123）
5. 创建成功后，自动跳转到登录界面
6. 使用管理员账户登录

### 已有账户流程

1. 启动后端服务器
2. 访问前端登录页面
3. 输入用户名和密码
4. 点击"验证登录"按钮

## 重要说明

1. **系统初始化**：后端数据库首次使用时需要初始化管理员账户，此操作只能执行一次
2. **管理员权限**：首次创建的账户为管理员，拥有系统所有权限
3. **密码要求**：初始化时密码至少 6 位字符
4. **自动检测**：前端会自动检测系统是否已初始化，自动显示对应的界面
5. **单次次初始化**：初始化接口一旦执行成功，将无法再次调用
