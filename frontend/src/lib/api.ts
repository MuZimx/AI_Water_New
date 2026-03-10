// 真实后端 API 客户端
// 配置后端服务器地址
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

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
  role?: '工人' | '管理员' | string;
  full_name?: string | null;
  phone?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface InitAdminRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  full_name?: string;
  phone?: string;
  role: '工人' | '管理员';
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

  // 如果有 token（仅在浏览器环境），添加认证头
  let token: string | null = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    token = localStorage.getItem('auth_token');
  }
  if (token) {
    (defaultHeaders as any)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    });

    // 更稳健地处理返回：优先解析 JSON，否则读取为文本（可能是空或 HTML 错误页）
    let data: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      // 可能是空响应（204）或 HTML 错误页，读取为文本以便调试
      const text = await response.text().catch(() => '');
      data = text ? { message: text, raw: text } : null;
    }

    if (!response.ok) {
      const fallbackMsg = response.statusText || `请求失败: ${response.status}`;
      const message = (data as any)?.message || fallbackMsg;
      throw new ApiError(message, response.status, data ?? { statusText: response.statusText });
    }

    return (data ?? {}) as T;
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

  // 注册（前端调用：允许选择角色 工人/管理员）
  register: async (payload: RegisterRequest): Promise<{ user: User; token?: string }> => {
    // 假设后端开放 /register 或 /users/register 路径处理公开注册
    const endpoint = '/register';
    const response = await request<{ success: boolean; data: { user: User; accessToken?: string } }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.success && response.data) {
      // 若后端返回 token，则保存
      if (response.data.accessToken) {
        localStorage.setItem('auth_token', response.data.accessToken);
      }
      return { user: response.data.user, token: response.data.accessToken };
    }
    throw new Error('注册失败');
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

  // 检修信息管理模块 API
  createMaintenanceRecord: async (data: { title: string; content: string; sensors: Array<{ id: number; name: string }> }): Promise<{ id: number }> => {
    const response = await request<{ success: boolean; data: { id: number } }>('/maintenance-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  uploadMaintenancePhotos: async (id: number, photos: File[]): Promise<Array<{ filename: string; originalName: string }>> => {
    const formData = new FormData();
    photos.forEach((photo) => {
      formData.append('photos', photo);
    });
    const response = await request<{ success: boolean; data: Array<{ filename: string; originalName: string }> }>(`/maintenance-records/${id}/photos`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
    return response.data;
  },

  getMaintenanceRecords: async (params?: { page?: number; size?: number; status?: string; sensor_id?: number }): Promise<{ data: any[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.size) queryParams.append('size', params.size.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sensor_id) queryParams.append('sensor_id', params.sensor_id.toString());
    const response = await request<{ success: boolean; data: any[]; total: number }>(`/maintenance-records?${queryParams}`);
    return { data: response.data, total: response.total };
  },

  getMaintenanceRecord: async (id: number): Promise<any> => {
    const response = await request<{ success: boolean; data: any }>(`/maintenance-records/${id}`);
    return response.data;
  },

  updateMaintenanceStatus: async (id: number, status: string): Promise<void> => {
    await request<{ success: boolean }>(`/maintenance-records/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // 信息反馈与命令指示系统 API
  createCommand: async (data: { title: string; content: string; deadline?: string }): Promise<{ id: number }> => {
    const response = await request<{ success: boolean; data: { id: number } }>('/commands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  uploadCommandAttachments: async (id: number, attachments: File[]): Promise<Array<{ filename: string; originalName: string }>> => {
    const formData = new FormData();
    attachments.forEach((attachment) => {
      formData.append('attachments', attachment);
    });
    const response = await request<{ success: boolean; data: Array<{ filename: string; originalName: string }> }>(`/commands/${id}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
    return response.data;
  },

  getCommands: async (params?: { page?: number; size?: number; status?: string }): Promise<{ data: any[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.size) queryParams.append('size', params.size.toString());
    if (params?.status) queryParams.append('status', params.status);
    const response = await request<{ success: boolean; data: any[]; total: number }>(`/commands?${queryParams}`);
    return { data: response.data, total: response.total };
  },

  getCommand: async (id: number): Promise<any> => {
    const response = await request<{ success: boolean; data: any }>(`/commands/${id}`);
    return response.data;
  },

  updateCommandStatus: async (id: number, status: string): Promise<void> => {
    await request<{ success: boolean }>(`/commands/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  submitCommandFeedback: async (id: number, content: string): Promise<{ id: number }> => {
    const response = await request<{ success: boolean; data: { id: number } }>(`/commands/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return response.data;
  },

  uploadCommandFeedbackPhotos: async (id: number, photos: File[]): Promise<Array<{ filename: string; originalName: string }>> => {
    const formData = new FormData();
    photos.forEach((photo) => {
      formData.append('photos', photo);
    });
    const response = await request<{ success: boolean; data: Array<{ filename: string; originalName: string }> }>(`/commands/${id}/feedback/photos`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
    return response.data;
  },
};
