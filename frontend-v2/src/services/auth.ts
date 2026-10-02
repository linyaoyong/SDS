import { apiClient } from '../utils/api';
import type { LoginResponse, RegisterRequest, UserDTO, UpdateUserRequest, Address, CreateAddressRequest } from '../types/api';

export const authAPI = {
  /** 登录 — 返回 { accessToken, refreshToken, userId, username, avatarUrl } */
  async login(credential: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>('/auth/login', {
      credential,
      password,
    });
    return res;
  },

  /** 注册 — 返回 void，成功后需手动登录 */
  async register(data: RegisterRequest): Promise<void> {
    await apiClient.post<void>('/auth/register', data);
  },

  /** 获取当前用户信息 */
  async getCurrentUser(): Promise<UserDTO> {
    return apiClient.get<UserDTO>('/users/me');
  },

  /** 刷新 token */
  async refreshToken(): Promise<boolean> {
    return apiClient.refreshToken();
  },
};

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

  /** 上传头像 */
  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.uploadFile<string>('/upload/avatar', file, 'file');
    return res;
  },
};

export const addressAPI = {
  async list(): Promise<Address[]> {
    return apiClient.get<Address[]>('/addresses') || [];
  },

  async create(data: CreateAddressRequest): Promise<Address> {
    return apiClient.post<Address>('/addresses', data);
  },

  async update(id: number, data: Partial<CreateAddressRequest>): Promise<Address> {
    return apiClient.put<Address>(`/addresses/${id}`, data);
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/addresses/${id}`);
  },
};
