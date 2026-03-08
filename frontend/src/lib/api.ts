// 真实后端 API 客户端
// 配置后端服务器地址
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export type RiskLevel = '高风险' | '中风险' | '低风险' | '未检测';

export interface AudioFile {
  id: number;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  upload_time: string;
  user_id: number;
  risk_level: RiskLevel;
  confidence: number;
  status?: 'processing' | 'completed' | 'error'; // 前端计算字段，后端不返回
}

export interface User {
  id: number;
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface InitAdminRequest {
  username: string;
  password: string;
}

export interface UploadResponse {
  file_id: string;
  status: string;
  message: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 请求工具函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 如果有 token，添加认证头
  const token = localStorage.getItem('auth_token');
  if (token) {
    (defaultHeaders as any)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        (data as any)?.message || `请求失败: ${response.status}`,
        response.status,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('网络错误，请检查连接', 0);
  }
}

export const API = {
  // 系统初始化
  checkInitStatus: async (): Promise<{ initialized: boolean }> => {
    const response = await request<{ success: boolean; initialized: boolean }>('/init-status');
    return { initialized: response.initialized };
  },

  initAdmin: async (credentials: InitAdminRequest): Promise<{ userId: number }> => {
    const response = await request<{ success: boolean; userId: number }>('/init-admin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return { userId: response.userId };
  },

  // 用户认证
  login: async (credentials: LoginRequest): Promise<{ user: User; token: string }> => {
    const response = await request<{ success: boolean; data: { accessToken: string; refreshToken: string; user: User } }>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      localStorage.setItem('auth_token', response.data.accessToken);
      return {
        user: response.data.user,
        token: response.data.accessToken
      };
    }
    throw new Error('登录失败');
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('auth_token');
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await request<{ success: boolean; data: User }>('/users/profile');
      return response.success ? response.data : null;
    } catch {
      return null;
    }
  },

  // 文件管理
  getFiles: async (): Promise<AudioFile[]> => {
    const response = await request<{ success: boolean; data: AudioFile[] }>('/audio-files');
    return response.success ? response.data : [];
  },

  uploadFile: async (file: File): Promise<AudioFile> => {
    const formData = new FormData();
    formData.append('audio', file);

    const token = localStorage.getItem('auth_token');
    const url = `${API_BASE_URL}/upload-audio`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new ApiError(
          responseData?.message || '上传失败',
          response.status,
          responseData
        );
      }

      // 返回上传后的文件信息（需要根据实际返回格式调整）
      return responseData.file || responseData.data || {};
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('网络错误，请检查连接', 0);
    }
  },

  deleteFile: async (id: number): Promise<void> => {
    return request<void>(`/audio-files/${id}`, {
      method: 'DELETE',
    });
  },

  // 轮询检查文件状态
  getFileStatus: async (filename: string): Promise<any> => {
    const response = await request<{ success: boolean; data: any }>(`/audio-processing-status/${filename}`);
    return response.success ? response.data : null;
  },
};
