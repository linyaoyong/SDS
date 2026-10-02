import { apiClient, API_BASE_URL, getToken } from '../utils/api';
import type { UpdateUserRequest } from '../types/api';

export const userAPI = {
  /** 获取用户公开信息 */
  async getUserById(userId: number): Promise<any> {
    return apiClient.get<any>(`/users/${userId}`);
  },

  /** 批量获取用户信息 */
  async batchGetUsers(ids: number[]): Promise<any[]> {
    if (ids.length === 0) return [];
    return apiClient.get<any[]>(`/users/batch?ids=${ids.join(',')}`);
  },

  /** 更新个人信息 */
  async updateProfile(data: UpdateUserRequest): Promise<void> {
    await apiClient.put<void>('/users/me', data);
  },

  /** 修改密码 */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.put<void>('/users/me/password', {
      oldPassword,
      newPassword,
    });
  },

  /** 上传头像 — 返回 URL 字符串 */
  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/upload/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await res.json();
    if (json.code === 200) {
      return json.data as string;
    }
    throw new Error(json.message || '头像上传失败');
  },
};
