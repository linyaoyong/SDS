/**
 * HTTP 客户端 — 封装 wx.request 实现拦截器模式
 * 参照 frontend-v2/src/utils/api.ts 的 Axios 封装
 */
import type { ApiResponse } from '../types/api';

const API_BASE_URL = 'http://localhost:8080/api';

// 直接从 Storage 读取 token，避免模块缓存问题
function getToken(): string | null {
  return wx.getStorageSync('token') || null;
}
function getRefreshToken(): string | null {
  return wx.getStorageSync('refreshToken') || null;
}
function saveTokens(token: string, refreshToken: string) {
  wx.setStorageSync('token', token);
  wx.setStorageSync('refreshToken', refreshToken);
}
function clearTokens() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('refreshToken');
  wx.removeStorageSync('user');
}

// 防止并发 token 刷新
let refreshPromise: Promise<boolean> | null = null;

function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = new Promise<boolean>(async (resolve) => {
    const rt = getRefreshToken();
    if (!rt) {
      refreshPromise = null;
      resolve(false);
      return;
    }
    wx.request({
      url: `${API_BASE_URL}/auth/refresh`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { refreshToken: rt },
      success: (res) => {
        const body = res.data as ApiResponse<{ token: string; refreshToken: string }>;
        if (body.code === 200 && body.data) {
          saveTokens(body.data.token, body.data.refreshToken);
          resolve(true);
        } else {
          resolve(false);
        }
      },
      fail: () => resolve(false),
      complete: () => { refreshPromise = null; },
    });
  });

  return refreshPromise;
}

interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
  skipAuth?: boolean;
}

function wxRequest<T>(config: RequestConfig): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const header: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.header || {}),
    };

    if (!config.skipAuth) {
      const token = getToken();
      if (token) {
        header['Authorization'] = `Bearer ${token}`;
      } else {
        console.error('NO TOKEN for request:', config.url);
      }
    }

    const fullUrl = config.url.startsWith('http')
      ? config.url
      : `${API_BASE_URL}${config.url}`;

    wx.request({
      url: fullUrl,
      method: config.method,
      data: config.data,
      header,
      success: (res) => {
        const body = res.data as ApiResponse<T>;

        if (body.code === 200) {
          resolve(body);
          return;
        }

        // 业务层面 token 过期
        if (body.code === 40003 || body.code === 40004) {
          refreshToken().then((ok) => {
            if (ok) {
              // 重发原请求
              wxRequest<T>(config).then(resolve).catch(reject);
            } else {
              clearTokens();
              wx.redirectTo({ url: '/pages/login/login' });
              reject(new Error('登录已过期，请重新登录'));
            }
          });
          return;
        }

        // 未授权
        if (body.code === 401) {
          clearTokens();
          wx.redirectTo({ url: '/pages/login/login' });
          reject(new Error('请重新登录'));
          return;
        }

        // 其他业务错误
        console.error('HTTP error', config.url, 'code:', body.code, 'msg:', body.message, 'httpStatus:', res.statusCode);
        reject({ code: body.code, message: body.message || '请求失败' });
      },
      fail: (err) => {
        console.error('HTTP network fail:', config.url, err);
        reject(new Error(err.errMsg || '网络异常，请稍后重试'));
      },
    });
  });
}

/**
 * 对外暴露的 HTTP API，模仿 frontend-v2 ApiClient 的接口
 */
export const http = {
  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const queryParts: string[] = [];
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
        }
      });
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await wxRequest<T>({ url: `${url}${queryString}`, method: 'GET' });
    return res.data;
  },

  async post<T>(url: string, data?: any): Promise<T> {
    const res = await wxRequest<T>({ url, method: 'POST', data });
    return res.data;
  },

  async put<T>(url: string, data?: any): Promise<T> {
    const res = await wxRequest<T>({ url, method: 'PUT', data });
    return res.data;
  },

  async delete<T>(url: string): Promise<T> {
    const res = await wxRequest<T>({ url, method: 'DELETE' });
    return res.data;
  },

  /**
   * 分页请求 — 处理后端两种分页响应格式
   */
  async getPage<T>(url: string, params?: Record<string, any>): Promise<{ data: T[]; total: number; page: number; size: number }> {
    const queryParts: string[] = [];
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
        }
      });
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await wxRequest<T[] | { records: T[]; total: number; page: number; size: number }>({
      url: `${url}${queryString}`,
      method: 'GET',
    });

    const body = res;
    // 格式 A: data: { records: [...], total, page, size }
    if (body.data && typeof body.data === 'object' && !Array.isArray(body.data) && 'records' in body.data) {
      const p = body.data as any;
      return { data: p.records || [], total: p.total || 0, page: p.page || 1, size: p.size || 20 };
    }
    // 格式 B: data 就是数组
    return {
      data: (Array.isArray(body.data) ? body.data : []) as T[],
      total: body.total || 0,
      page: body.page || 1,
      size: body.size || 20,
    };
  },

  /**
   * 文件上传 — 封装 wx.uploadFile
   */
  uploadFile<T>(url: string, filePath: string, formData?: Record<string, any>): Promise<T> {
    return new Promise((resolve, reject) => {
      const token = getToken();
      wx.uploadFile({
        url: url.startsWith('http') ? url : `${API_BASE_URL}${url}`,
        filePath,
        name: 'file',
        formData,
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          try {
            const body = JSON.parse(res.data) as ApiResponse<T>;
            if (body.code === 200) {
              resolve(body.data);
            } else {
              reject(new Error(body.message || '上传失败'));
            }
          } catch {
            reject(new Error('上传响应解析失败'));
          }
        },
        fail: (err) => reject(new Error(err.errMsg || '上传失败')),
      });
    });
  },
};

/**
 * 解析后端返回的资源 URL（图片等）
 */
export function resolveUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  if (path.startsWith('/api/')) return path;
  if (path.startsWith('/')) return `${API_BASE_URL}${path}`;
  return path;
}

export { getToken, getRefreshToken, saveTokens, clearTokens };
