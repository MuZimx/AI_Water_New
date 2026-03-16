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

## 一键安装

```bash
curl -sSL https://raw.githubusercontent.com/MuZimx/AI_Water_New/refs/heads/main/install-backend.sh | bash
```

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
git clone https://github.com/MuZimx/AI_Water_New.git
cd AI_Water_New
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **安装 Python 依赖**（AI 模型必需）
```bash
cd backend/py

# 安装所有依赖
pip install -r requirements.txt

# 或手动安装核心依赖
pip install macls torch torchaudio
```

4. **安装前端依赖**
```bash
cd ../frontend
npm install
```

5. **配置后端**
```bash
cd ../backend
```

首次运行需要初始化管理员账户:
```bash
# 启动后端服务
npm run dev
```

然后访问前端初始化页面 `http://localhost:9002/init-admin` 创建管理员账户。

如需直接调用后端接口，也可使用 `POST http://localhost:3000/api/init-admin`：
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

## 环境变量说明

本项目环境变量分为后端（`backend/.env`）和前端（`frontend/.env.local`）。

### 后端环境变量（backend）

建议从 `backend/.env.example` 复制：

```bash
cd backend
cp .env.example .env
```

| 变量名 | 是否必填 | 示例 | 作用 |
|---|---|---|---|
| `PORT` | 否 | `3001` | 后端服务监听端口，不填默认 `3001`。 |
| `DATABASE_URL` | 是 | `file:./db/users.db` | Prisma 使用的数据库连接串。 |
| `ACCESS_TOKEN_SECRET` | 建议是 | `change_this_access_secret` | JWT 访问令牌签名密钥。 |
| `REFRESH_TOKEN_SECRET` | 建议是 | `change_this_refresh_secret` | JWT 刷新令牌签名密钥。 |
| `ACCESS_TOKEN_EXPIRES_IN` | 否 | `15m` | 访问令牌过期时间。 |
| `REFRESH_TOKEN_EXPIRES_IN` | 否 | `7d` | 刷新令牌过期时间。 |
| `API_BASE_URL` | 否 | `http://127.0.0.1:3001/api` | 仅用于 `backend/test-api.js` 测试脚本请求地址。 |

### 前端环境变量（frontend）

建议从 `frontend/.env.example` 复制：

```bash
cd frontend
cp .env.example .env.local
```

| 变量名 | 是否必填 | 示例 | 作用 |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | 建议是 | `http://127.0.0.1:3001/api` | 前端请求后端 API 的基地址。 |
| `NEXT_PUBLIC_OFFLINE_TILE_URL` | 否 | `/tiles/{z}/{x}/{y}.png` | 地图离线瓦片模板地址（优先级最高）。 |
| `NEXT_PUBLIC_MAP_STYLE` | 否 | `https://.../style.json` | MapLibre/Mapbox 样式地址。 |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | 否 | `pk.xxx` | 当样式地址依赖 token 时使用。 |
| `NEXT_PUBLIC_TDT_KEY` | 否 | `your_tianditu_key` | 天地图 Key（特定地图模式使用）。 |

> 注意：所有 `NEXT_PUBLIC_` 开头变量会暴露到浏览器端，请勿放置私密信息。

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
- **音频分类**: macls (PaddlePaddle Audio Classification)
- **模型架构**: ResNet-SE (Squeeze-and-Excitation)
- **音频处理**: torchaudio, librosa

**重要提示**：AI 模型需要安装 Python 依赖：
```bash
cd backend/py
pip install -r requirements.txt
```
或手动安装核心依赖：
```bash
pip install macls torch torchaudio
```

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
建议分别创建 `backend/.env` 和 `frontend/.env.local`（可从各自 `.env.example` 复制）：
```env
# backend/.env
PORT=3001
DATABASE_URL=file:./db/users.db
ACCESS_TOKEN_SECRET=change_this_access_secret
REFRESH_TOKEN_SECRET=change_this_refresh_secret

# frontend/.env.local
NEXT_PUBLIC_API_BASE_URL=https://your-domain/api
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
