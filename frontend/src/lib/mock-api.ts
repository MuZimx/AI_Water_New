"use client";

// 简单的 ID 生成器，替代 uuid 包
function generateId(): string {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

export type RiskLevel = '高风险' | '中风险' | '低风险' | '未检测';

export interface AudioFile {
  id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  upload_time: string;
  user_id: string;
  risk_level: RiskLevel;
  confidence: number;
  status: 'processing' | 'completed' | 'error';
}

export interface User {
  id: string;
  username: string;
}

const STORAGE_KEYS = {
  FILES: 'aquasense_files',
  USER: 'aquasense_user',
  INIT: 'aquasense_initialized'
};

export const MockAPI = {
  isInitialized: () => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEYS.INIT) === 'true';
  },

  initAdmin: (username: string) => {
    localStorage.setItem(STORAGE_KEYS.INIT, 'true');
    const user = { id: generateId(), username };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  },

  login: (username: string) => {
    const user = { id: generateId(), username };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getFiles: (): AudioFile[] => {
    const data = localStorage.getItem(STORAGE_KEYS.FILES);
    return data ? JSON.parse(data) : [];
  },

  uploadFile: (file: File): Promise<AudioFile> => {
    return new Promise((resolve) => {
      const currentUser = MockAPI.getCurrentUser();
      const newFile: AudioFile = {
        id: generateId(),
        filename: `audio-${Date.now()}.mp3`,
        original_name: file.name,
        mimetype: file.type,
        size: file.size,
        upload_time: new Date().toISOString(),
        user_id: currentUser?.id || 'unknown',
        risk_level: '未检测',
        confidence: 0,
        status: 'processing'
      };

      const files = MockAPI.getFiles();
      files.unshift(newFile);
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));

      // Simulate processing
      setTimeout(() => {
        const currentFiles = MockAPI.getFiles();
        const fileIndex = currentFiles.findIndex(f => f.id === newFile.id);
        if (fileIndex !== -1) {
          const risks: RiskLevel[] = ['高风险', '中风险', '低风险'];
          const randomRisk = risks[Math.floor(Math.random() * risks.length)];
          currentFiles[fileIndex].risk_level = randomRisk;
          currentFiles[fileIndex].confidence = Number((0.6 + Math.random() * 0.39).toFixed(2));
          currentFiles[fileIndex].status = 'completed';
          localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(currentFiles));
        }
      }, 5000);

      resolve(newFile);
    });
  },

  deleteFile: (id: string) => {
    const files = MockAPI.getFiles().filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
  }
};