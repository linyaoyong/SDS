import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios';
import type { ApiResponse } from '../types/api';

export const API_BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}
function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}
function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('token', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}
function clearTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

async function tryRefreshToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await axios.post<ApiResponse<{ token: string; refreshToken: string }>>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken: rt },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res.data.code === 200 && res.data.data) {
      saveTokens(res.data.data.token, res.data.data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** 后端分页响应：data 内可能包裹 { records: [...], total, page, size } */
interface PaginatedBody {
  records?: any[];
  total?: number;
  page?: number;
  size?: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      const token = getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    }, (error) => Promise.reject(error));

    this.client.interceptors.response.use(
      (response) => {
        const apiResponse: ApiResponse = response.data;
        if (apiResponse.code === 200) return response;
        if (apiResponse.code === 40003 || apiResponse.code === 40004) {
          return Promise.reject({ __needRefresh: true, code: apiResponse.code, message: apiResponse.message, _originalRequest: response.config });
        }
        if (apiResponse.code === 401) { clearTokens(); window.location.href = '/login'; return Promise.reject(new Error('请重新登录')); }
        return Promise.reject({ code: apiResponse.code, message: apiResponse.message || '请求失败' });
      },
      async (error: AxiosError & { __needRefresh?: boolean; _originalRequest?: any }) => {
        if ((error as any)?.__needRefresh) {
          const refreshed = await tryRefreshToken();
          if (refreshed) {
            const origConfig = (error as any)._originalRequest;
            if (origConfig) { origConfig.headers.Authorization = `Bearer ${getToken()}`; return this.client.request(origConfig); }
          }
          clearTokens(); window.location.href = '/login'; return Promise.reject(new Error('登录已过期'));
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearTokens(); window.location.href = '/login'; return Promise.reject(new Error('请重新登录'));
        }
        return Promise.reject(error);
      }
    );
  }

  async refreshToken(): Promise<boolean> { return tryRefreshToken(); }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  /**
   * 获取分页响应。
   * 后端实际返回: { code, data: { records: [...], total, page, size } }
   * 我们统一提取为: { code, data: [...], total, page, size }
   */
  async getPage<T>(url: string, config?: AxiosRequestConfig): Promise<{ data: T[]; total: number; page: number; size: number }> {
    const response = await this.client.get<ApiResponse<PaginatedBody | T[]>>(url, config);
    const body = response.data;

    // 处理两种格式:
    // 格式A (实际): data: { records: [...], total, page, size }
    // 格式B (文档): data: [...], 分页字段在顶层
    if (body.data && typeof body.data === 'object' && !Array.isArray(body.data) && 'records' in body.data) {
      const p = body.data as PaginatedBody;
      return { data: (p.records || []) as T[], total: p.total || 0, page: p.page || 1, size: p.size || 20 };
    }
    // 格式B: data 就是数组，分页字段在顶层
    return { data: (Array.isArray(body.data) ? body.data : []) as T[], total: body.total || 0, page: body.page || 1, size: body.size || 20 };
  }

  /** 文件上传 - 用原生 fetch 避免 axios 默认 Content-Type 干扰 multipart */
  async uploadFile<T>(url: string, file: File, fieldName: string = 'file'): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    const token = getToken();
    const fullUrl = `${this.client.defaults.baseURL}${url}`;
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await res.json();
    if (json.code !== 200) throw new Error(json.message || 'Upload failed');
    return json.data;
  }
}

/**
 * 解析后端返回的资源 URL
 * 后端可能返回完整路径如 /api/static/avatars/x.jpg (已含 /api 前缀)
 * 前端 API_BASE_URL 默认是 /api，需避免重复拼接
 */
export function resolveUrl(path: string | null | undefined): string {
  if (!path) return '';
  // 已经是完整 URL（含协议或以 /api/ 开头）
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  if (path.startsWith('/api/')) return path;
  // 以 / 开头但非 /api/ — 拼接 API_BASE_URL
  if (path.startsWith('/')) return `${API_BASE_URL}${path}`;
  return path;
}

export const apiClient = new ApiClient();
export { getToken, getRefreshToken, saveTokens, clearTokens };
