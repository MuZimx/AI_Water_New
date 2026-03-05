# AI 智慧水务管理系统

<div align="center">

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat-square&logo=vue.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat-square&logo=python&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

一个基于 AI 音频识别的智慧水务管理系统，支持用户管理、音频上传、AI 检测等功能。

[功能特性](#功能特性) • [快速开始](#快速开始) • [技术栈](#技术栈) • [项目结构](#项目结构)

</div>

## 功能特性

- 🔐 **用户认证系统**: 支持管理员初始化、用户登录、JWT 令牌认证
- 🎵 **音频管理**: 音频文件上传、列表展示、删除功能
- 🤖 **AI 检测**: 基于 ResNet-SE 模型的音频分类和风险等级检测
- 📊 **数据可视化**: 音频检测结果展示和统计
- 📱 **响应式设计**: 基于 Next.js 和 Radix UI 的现代化 UI
- 🔒 **安全防护**: 密码加密、文件类型验证、访问令牌管理

## 快速开始

### 环境要求

- Node.js >= 18.0
- Python >= 3.8
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/你的用户名/AI_Water_New.git
cd AI_Water_New
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **安装前端依赖**
```bash
cd ../frontend
npm install
```

4. **配置后端**
```bash
cd ../backend
```

首次运行需要初始化管理员账户:
```bash
# 启动后端服务
npm run dev
```

然后访问 `http://localhost:3000/api/init-admin` 初始化管理员账户（POST 请求）:
```json
{
  "username": "admin",
  "password": "your_password"
}
```

5. **启动前端**
```bash
cd frontend
npm run dev
```

6. **访问应用**
- 前端地址: http://localhost:9002
- 后端地址: http://localhost:3000

## 技术栈

### 前端
- **框架**: Next.js 15.5 + React 19
- **UI 组件**: Radix UI + Tailwind CSS
- **表单**: React Hook Form + Zod
- **图表**: Recharts
- **图标**: Lucide React
- **状态管理**: React Context
- **类型检查**: TypeScript

### 后端
- **框架**: Express.js
- **数据库**: SQLite3
- **认证**: JWT (jsonwebtoken + bcrypt)
- **文件处理**: Multer
- **Python 集成**: python-shell

### AI 模型
- **深度学习框架**: PyTorch
- **模型架构**: ResNet-SE (Squeeze-and-Excitation)
- **音频处理**: torchaudio

## 项目结构

```
AI_Water_New/
├── backend/                 # 后端服务
│   ├── db/                 # SQLite 数据库
│   ├── py/                 # Python AI 模型
│   │   ├── config/         # 模型配置
│   │   ├── dataset/        # 数据集
│   │   └── model/          # 训练好的模型
│   ├── uploads/            # 上传的音频文件
│   ├── utils/              # 工具函数
│   ├── server.js           # 后端主服务
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── app/           # Next.js 页面
│   │   ├── components/    # React 组件
│   │   └── lib/           # 工具库
│   └── package.json
└── README.md
```

## API 文档

### 认证接口

#### 初始化管理员账户
```
POST /api/init-admin
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

#### 用户登录
```
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}

响应:
{
  "success": true,
  "data": {
    "accessToken": "xxx",
    "refreshToken": "xxx",
    "user": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

### 音频接口

#### 上传音频文件
```
POST /api/upload-audio
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

file: <audio file>

响应:
{
  "success": true,
  "message": "音频文件上传成功",
  "file": {
    "filename": "audio-xxx.mp3",
    "originalName": "test.mp3",
    "mimetype": "audio/mpeg",
    "size": 1234567
  }
}
```

#### 获取音频列表
```
GET /api/audio-files?page=1&size=10
Authorization: Bearer {accessToken}
```

#### 删除音频文件
```
DELETE /api/audio-files/{id}
Authorization: Bearer {accessToken}
```

## 开发指南

### 后端开发
```bash
cd backend
npm run dev          # 开发模式（支持热重载）
npm run start        # 生产模式
```

### 前端开发
```bash
cd frontend
npm run dev          # 开发模式（端口 9002）
npm run build        # 构建生产版本
npm run start        # 启动生产版本
```

### AI 模型训练
如需重新训练模型，请参考 `backend/py/` 目录下的训练脚本。

## 部署

### 生产环境部署

1. **构建前端**
```bash
cd frontend
npm run build
```

2. **配置环境变量**
创建 `.env` 文件:
```env
PORT=3000
NODE_ENV=production
```

3. **启动服务**
```bash
cd backend
npm run start:prod
```

4. **使用 PM2 守护进程** (推荐)
```bash
npm install -g pm2
pm2 start backend/server.js --name ai-water-backend
pm2 startup
pm2 save
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 作者

南哪战队

## 致谢

感谢所有为这个项目做出贡献的开发者！

---

<div align="center">
  <sub>Built with ❤️ by 南哪战队</sub>
</div>
