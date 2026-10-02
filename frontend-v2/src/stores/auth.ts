import { create } from 'zustand';
import type { UserDTO } from '../types/api';
import { messageAPI } from '../services/message';
import { getToken, getRefreshToken, saveTokens, clearTokens } from '../utils/api';

interface AuthState {
  user: UserDTO | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** 登录：保存 tokens + 用户信息 */
  login: (accessToken: string, refreshToken: string, user: UserDTO) => void;
  logout: () => void;
  updateUser: (user: Partial<UserDTO>) => void;
  /** 静默刷新 token（不跳转） */
  refreshAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) as UserDTO : null;
    } catch {
      return null;
    }
  })(),
  token: getToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: !!getToken(),

  login: (accessToken: string, refreshToken: string, user: UserDTO) => {
    saveTokens(accessToken, refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token: accessToken, refreshToken, user, isAuthenticated: true });
  },

  logout: () => {
    clearTokens();
    localStorage.removeItem('user');
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  updateUser: (userData: Partial<UserDTO>) => {
    set((state) => {
      const updated = state.user ? { ...state.user, ...userData } : null;
      if (updated) localStorage.setItem('user', JSON.stringify(updated));
      return { user: updated };
    });
  },

  refreshAuth: async () => {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        saveTokens(json.data.token, json.data.refreshToken);
        set({ token: json.data.token, refreshToken: json.data.refreshToken });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));

interface WebSocketState {
  isConnected: boolean;
  messages: any[];
  unreadCount: number;
  connect: () => void;
  disconnect: () => void;
  addMessage: (message: any) => void;
  clearMessages: () => void;
  setUnreadCount: (count: number) => void;
  refreshUnreadCount: () => Promise<void>;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  isConnected: false,
  messages: [],
  unreadCount: 0,
  connect: () => set({ isConnected: true }),
  disconnect: () => set({ isConnected: false }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  setUnreadCount: (count: number) => set({ unreadCount: count }),
  refreshUnreadCount: async () => {
    try {
      const count = await messageAPI.getUnreadCount();
      set({ unreadCount: count });
    } catch {
      // ignore
    }
  },
}));
