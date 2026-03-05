# AI Water | 智能水务基础设施监控系统

本项目是一个基于 Next.js 和 Genkit 的智能水务音频异常检测系统原型。

## 本地运行指南

### 1. 前置条件

确保您的本地环境已安装：
- [Node.js](https://nodejs.org/) (建议 v18 或更高版本)
- [npm](https://www.npmjs.com/)

### 2. 下载并安装

1. 将项目下载到本地文件夹。
2. 在项目根目录下打开终端。
3. 运行以下命令安装所需依赖：
   ```bash
   npm install
   ```

### 3. 配置环境变量

在本地创建一个 `.env` 文件，并添加必要的 API 密钥（如 Google Generative AI 的密钥）：
```env
GEMINI_API_KEY=您的_API_KEY
```

### 4. 启动项目

#### 开发模式
运行以下命令启动 Next.js 开发服务器：
```bash
npm run dev
```
项目将在 [http://localhost:9002](http://localhost:9002) 运行。

#### 启动 Genkit 开发者界面
如果您需要调试 AI Flow：
```bash
npm run genkit:dev
```

## 技术栈

- **前端框架**: Next.js 15 (App Router)
- **UI 组件**: ShadCN UI + Tailwind CSS
- **AI 框架**: Genkit (Google Gemini 2.5 Flash)
- **模拟后端**: 基于 LocalStorage 的 Mock API

---
© 2024 AI Water 监控系统。
