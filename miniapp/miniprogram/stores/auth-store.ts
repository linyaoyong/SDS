/**
 * 认证状态管理单例 — EventEmitter 模式
 * 参照 frontend-v2/src/stores/auth.ts（Zustand），适配微信小程序
 */
import type { UserDTO } from '../types/api';

type AuthListener = (data: {
  user: UserDTO | null;
  token: string | null;
  isAuthenticated: boolean;
}) => void;

class AuthStore {
  private _user: UserDTO | null = null;
  private _token: string | null = null;
  private _refreshToken: string | null = null;
  private _isAuthenticated = false;
  private _listeners: Set<AuthListener> = new Set();

  constructor() {
    // 初始化时从 Storage 恢复
    try {
      this._token = wx.getStorageSync('token') || null;
      this._refreshToken = wx.getStorageSync('refreshToken') || null;
      const raw = wx.getStorageSync('user');
      if (raw) this._user = JSON.parse(raw) as UserDTO;
      this._isAuthenticated = !!this._token && !!this._user;
    } catch {
      // ignore
    }
  }

  // ---- 只读属性 ----
  get user(): UserDTO | null { return this._user; }
  get token(): string | null { return this._token; }
  get refreshToken(): string | null { return this._refreshToken; }
  get isAuthenticated(): boolean { return this._isAuthenticated; }

  // ---- 订阅/取消订阅 ----
  subscribe(listener: AuthListener): void {
    this._listeners.add(listener);
  }

  unsubscribe(listener: AuthListener): void {
    this._listeners.delete(listener);
  }

  private _notify(): void {
    const data = {
      user: this._user,
      token: this._token,
      isAuthenticated: this._isAuthenticated,
    };
    this._listeners.forEach((fn) => {
      try { fn(data); } catch { /* ignore listener errors */ }
    });
  }

  // ---- 操作方法 ----
  login(token: string, refreshToken: string, user: UserDTO): void {
    wx.setStorageSync('token', token);
    wx.setStorageSync('refreshToken', refreshToken);
    wx.setStorageSync('user', JSON.stringify(user));
    this._token = token;
    this._refreshToken = refreshToken;
    this._user = user;
    this._isAuthenticated = true;
    this._notify();
  }

  logout(): void {
    wx.removeStorageSync('token');
    wx.removeStorageSync('refreshToken');
    wx.removeStorageSync('user');
    this._token = null;
    this._refreshToken = null;
    this._user = null;
    this._isAuthenticated = false;
    this._notify();
  }

  updateUser(data: Partial<UserDTO>): void {
    if (!this._user) return;
    this._user = { ...this._user, ...data };
    wx.setStorageSync('user', JSON.stringify(this._user));
    this._notify();
  }

  updateTokens(token: string, refreshToken: string): void {
    wx.setStorageSync('token', token);
    wx.setStorageSync('refreshToken', refreshToken);
    this._token = token;
    this._refreshToken = refreshToken;
  }

  /**
   * 静默刷新 token（不跳转）
   */
  async refreshAuth(): Promise<boolean> {
    const rt = this._refreshToken;
    if (!rt) return false;
    try {
      return new Promise((resolve) => {
        wx.request({
          url: 'http://localhost:8080/api/auth/refresh',
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: { refreshToken: rt },
          success: (res) => {
            const body = res.data as any;
            if (body.code === 200 && body.data) {
              this.updateTokens(body.data.token, body.data.refreshToken);
              resolve(true);
            } else {
              resolve(false);
            }
          },
          fail: () => resolve(false),
        });
      });
    } catch {
      return false;
    }
  }
}

export const authStore = new AuthStore();
