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
      '127.0.0.1:*',
      '192.168.*:*',
      '10.0.*:*',
      'api-aiwater.cszj.wang:*',
      '*.cszj.wang:*'
    ],
    // 允许明文流量（开发调试时使用）
    cleartext: true
  }
};

export default config;
