/**
 * 认证 API
 * 参照 frontend-v2/src/services/auth.ts
 */
import { http } from '../utils/http';
import type { LoginRequest, LoginResponse, RegisterRequest, UserDTO } from '../types/api';

export const authAPI = {
  async login(credential: string, password: string): Promise<LoginResponse> {
    return http.post<LoginResponse>('/auth/login', {
      credential,
      password,
    });
  },

  async register(data: RegisterRequest): Promise<void> {
    await http.post<void>('/auth/register', data);
  },

  // GET /users/me — 后端 UserProfileController @RequestMapping("/api/users")
  async getCurrentUser(): Promise<UserDTO> {
    return http.get<UserDTO>('/users/me');
  },
};

export const userAPI = {
  // GET /users/me
  async getProfile(): Promise<UserDTO> {
    return http.get<UserDTO>('/users/me');
  },

  // PUT /users/me — 后端返回 ApiResponse<Void>，无返回数据
  async updateProfile(data: Partial<UserDTO>): Promise<void> {
    await http.put<void>('/users/me', data);
  },

  // PUT /users/me/password
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await http.put<void>('/users/me/password', {
      oldPassword,
      newPassword,
    });
  },

  async uploadAvatar(filePath: string): Promise<string> {
    return http.uploadFile<string>('/upload/avatar', filePath);
  },

  async getUserById(userId: number): Promise<UserDTO> {
    return http.get<UserDTO>(`/users/${userId}`);
  },

  async batchGetUsers(ids: number[]): Promise<UserDTO[]> {
    if (!ids || ids.length === 0) return [];
    const idStr = ids.join(',');
    return http.get<UserDTO[]>(`/users/batch?ids=${idStr}`);
  },
};
