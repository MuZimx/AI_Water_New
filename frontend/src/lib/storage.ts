import { Preferences } from '@capacitor/preferences';

// 统一的存储工具，兼容浏览器和 Capacitor 原生环境
export const storage = {
  // 获取值
  async getItem(key: string): Promise<string | null> {
    try {
      // 在浏览器环境使用 localStorage
      if (typeof window !== 'undefined' && !window.Capacitor) {
        return localStorage.getItem(key);
      }
      // 在 Capacitor 环境使用 Preferences
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  // 设置值
  async setItem(key: string, value: string): Promise<void> {
    try {
      // 在浏览器环境使用 localStorage
      if (typeof window !== 'undefined' && !window.Capacitor) {
        localStorage.setItem(key, value);
        return;
      }
      // 在 Capacitor 环境使用 Preferences
      await Preferences.set({ key, value });
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw error;
    }
  },

  // 删除值
  async removeItem(key: string): Promise<void> {
    try {
      // 在浏览器环境使用 localStorage
      if (typeof window !== 'undefined' && !window.Capacitor) {
        localStorage.removeItem(key);
        return;
      }
      // 在 Capacitor 环境使用 Preferences
      await Preferences.remove({ key });
    } catch (error) {
      console.error('Storage removeItem error:', error);
      throw error;
    }
  },

  // 清空所有
  async clear(): Promise<void> {
    try {
      // 在浏览器环境使用 localStorage
      if (typeof window !== 'undefined' && !window.Capacitor) {
        localStorage.clear();
        return;
      }
      // 在 Capacitor 环境使用 Preferences
      await Preferences.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }
};

// 便捷方法：存储 JSON 对象
export async function setJSON<T>(key: string, value: T): Promise<void> {
  return storage.setItem(key, JSON.stringify(value));
}

// 便捷方法：获取 JSON 对象
export async function getJSON<T>(key: string): Promise<T | null> {
  const value = await storage.getItem(key);
  return value ? JSON.parse(value) : null;
}
