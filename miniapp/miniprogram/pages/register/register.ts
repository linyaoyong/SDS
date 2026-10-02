/**
 * 注册页
 * 参照 frontend-v2/src/pages/Register.tsx
 */
import { authAPI } from '../../services/auth';
import { authStore } from '../../stores/auth-store';

Component({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    email: '',
    studentId: '',
    name: '',
    showPassword: false,
    showConfirmPassword: false,
    loading: false,
    error: '',
  },

  methods: {
    onInput(e: WechatMiniprogram.Input) {
      const field = e.currentTarget.dataset.field as string;
      if (field) {
        this.setData({ [field]: e.detail.value, error: '' });
      }
    },

    togglePassword() {
      this.setData({ showPassword: !this.data.showPassword });
    },

    toggleConfirmPassword() {
      this.setData({ showConfirmPassword: !this.data.showConfirmPassword });
    },

    async handleRegister() {
      const { loading, username, password, confirmPassword, phone, email, studentId, name } = this.data;
      if (loading) return;

      // 客户端校验
      if (!username.trim()) { this.setData({ error: '请输入用户名' }); return; }
      if (!password) { this.setData({ error: '请输入密码' }); return; }
      if (password.length < 6) { this.setData({ error: '密码至少 6 位' }); return; }
      if (password !== confirmPassword) { this.setData({ error: '两次密码不一致' }); return; }
      if (!phone.trim()) { this.setData({ error: '请输入手机号' }); return; }
      if (!/^1[3-9]\d{9}$/.test(phone.trim())) { this.setData({ error: '手机号格式不正确' }); return; }
      if (!email.trim()) { this.setData({ error: '请输入邮箱' }); return; }
      if (!studentId.trim()) { this.setData({ error: '请输入学号' }); return; }
      if (!name.trim()) { this.setData({ error: '请输入姓名' }); return; }

      this.setData({ loading: true, error: '' });

      try {
        await authAPI.register({
          username: username.trim(),
          password,
          phone: phone.trim(),
          email: email.trim(),
          studentId: studentId.trim(),
          name: name.trim(),
        });

        wx.showToast({ title: '注册成功，请登录', icon: 'success', duration: 2000 });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } catch (err: any) {
        this.setData({ error: err.message || '注册失败' });
      } finally {
        this.setData({ loading: false });
      }
    },

    goLogin() {
      wx.navigateBack();
    },
  },
});
