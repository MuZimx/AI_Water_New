import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aiwater.app',
  appName: 'AI_Water',
  webDir: 'out',
  server: {
    // 使用 HTTPS 作为 Android 的导航方案，防止外部链接劫持
    androidScheme: 'https',
    // 明确的导航白名单（替换为你的实际后端 API 域名）
    allowNavigation: [
      'localhost:*',
      // 添加你的后端 API 域名，例如:
      // 'api.yourdomain.com:*',
      // '*.yourdomain.com:*'
    ],
    // 仅在必要时允许 HTTP（不推荐生产环境使用）
    cleartext: false
  }
};

export default config;
