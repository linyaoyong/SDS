/**
 * 登录页 — 支持用户名/手机号/邮箱/学号 + 密码登录
 * 参照 frontend-v2/src/pages/Login.tsx
 */
import { authAPI } from '../../services/auth';
import { authStore } from '../../stores/auth-store';

Component({
  data: {
    credential: '',
    password: '',
    showPassword: false,
    loading: false,
    error: '',
  },

  methods: {
    onCredentialInput(e: WechatMiniprogram.Input) {
      this.setData({ credential: e.detail.value, error: '' });
    },

    onPasswordInput(e: WechatMiniprogram.Input) {
      this.setData({ password: e.detail.value, error: '' });
    },

    togglePassword() {
      this.setData({ showPassword: !this.data.showPassword });
    },

    async handleLogin() {
      const { credential, password, loading } = this.data;
      if (loading) return;

      // 客户端校验
      if (!credential.trim()) {
        this.setData({ error: '请输入用户名/手机号/邮箱/学号' });
        return;
      }
      if (!password) {
        this.setData({ error: '请输入密码' });
        return;
      }

      this.setData({ loading: true, error: '' });

      try {
        const res = await authAPI.login(credential.trim(), password);

        // 存储 token 和用户信息
        authStore.login(res.accessToken, res.refreshToken, {
          id: res.userId,
          username: res.username,
          avatarUrl: res.avatarUrl,
          phone: '',
          email: '',
          studentId: '',
          name: '',
          gender: 0,
          role: 0,
          status: 0,
          creditScore: 5.0,
          createdAt: '',
          updatedAt: '',
        });

        // 验证 token 已存储
        const storedToken = authStore.token;
        if (!storedToken) {
          wx.showToast({ title: 'Token存储失败!', icon: 'error', duration: 5000 });
        }

        // 获取完整用户信息
        try {
          const user = await authAPI.getCurrentUser();
          authStore.updateUser(user);
        } catch (e: any) {
          // 获取失败不影响登录
          wx.showToast({ title: '用户信息获取失败', icon: 'none', duration: 2000 });
        }

        wx.showToast({ title: '登录成功', icon: 'success', duration: 1500 });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/products/products' });
        }, 500);
      } catch (err: any) {
        this.setData({
          error: err.message || '登录失败，请检查账号密码',
          loading: false,
        });
      }
    },

    goRegister() {
      wx.navigateTo({ url: '/pages/register/register' });
    },
  },
});
