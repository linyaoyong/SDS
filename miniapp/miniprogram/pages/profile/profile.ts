/**
 * 个人中心
 */
import { userAPI } from '../../services/auth';
import { authStore } from '../../stores/auth-store';
import { wsService } from '../../services/websocket';
import { resolveUrl } from '../../utils/http';
import { showToast, showLoading, hideLoading } from '../../utils/format';
import type { UserDTO } from '../../types/api';

Component({
  data: {
    user: null as UserDTO | null,
    isAuthenticated: false,
    editMode: false,
    showPasswordForm: false,
    // 编辑表单
    formName: '',
    formPhone: '',
    formSchool: '',
    formCollege: '',
    formMajor: '',
    formGrade: '',
    // 密码
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  },

  lifetimes: {
    attached() {
      const isAuth = authStore.isAuthenticated;
      this.setData({ isAuthenticated: isAuth, user: authStore.user });
      this._authCb = (d: any) => {
        this.setData({ isAuthenticated: d.isAuthenticated, user: d.user });
      };
      authStore.subscribe(this._authCb);
    },
    detached() {
      if (this._authCb) authStore.unsubscribe(this._authCb);
    },
  },

  methods: {
    onShow() {
      const isAuth = authStore.isAuthenticated;
      const user = authStore.user;
      const updateData: any = { isAuthenticated: isAuth, user: user };
      // 始终预填表单数据，确保编辑表单不会空白
      if (user) {
        updateData.formName = user.name || '';
        updateData.formPhone = user.phone || '';
        updateData.formSchool = user.school || '';
        updateData.formCollege = user.college || '';
        updateData.formMajor = user.major || '';
        updateData.formGrade = user.grade || '';
      }
      this.setData(updateData);
      // 拉取最新用户信息，确保个人数据完整（修复登录时 getCurrentUser 失败导致数据缺失）
      if (isAuth) {
        this.fetchProfile();
      }
    },

    async fetchProfile() {
      try {
        const fresh = await userAPI.getProfile();
        if (fresh) {
          authStore.updateUser(fresh);
          this.setData({
            user: fresh,
            formName: fresh.name || '',
            formPhone: fresh.phone || '',
            formSchool: fresh.school || '',
            formCollege: fresh.college || '',
            formMajor: fresh.major || '',
            formGrade: fresh.grade || '',
          });
        }
      } catch {
        /* ignore — 保留 authStore 中的旧数据 */
      }
    },
    goLogin() {
      wx.navigateTo({ url: '/pages/login/login' });
    },

    handleLogout() {
      wx.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            wsService.disconnect();
            authStore.logout();
            wx.switchTab({ url: '/pages/products/products' });
          }
        },
      });
    },

    chooseAvatar() {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          showLoading('上传中...');
          try {
            const url = await userAPI.uploadAvatar(res.tempFilePaths[0]);
            authStore.updateUser({ avatarUrl: url });
            hideLoading();
            showToast('头像更新成功', 'success');
          } catch (err: any) {
            hideLoading();
            showToast(err.message || '上传失败', 'error');
          }
        },
      });
    },

    toggleEdit() {
      if (!this.data.editMode) {
        const user = this.data.user;
        this.setData({
          editMode: true,
          formName: user?.name || '',
          formPhone: user?.phone || '',
          formSchool: user?.school || '',
          formCollege: user?.college || '',
          formMajor: user?.major || '',
          formGrade: user?.grade || '',
        });
      } else {
        this.setData({ editMode: false });
      }
    },

    onFormInput(e: WechatMiniprogram.Input) {
      const field = e.currentTarget.dataset.field as string;
      if (field) this.setData({ [field]: e.detail.value });
    },

    async saveProfile() {
      showLoading('保存中...');
      try {
        // 后端 updateProfile 返回 void，不能用返回值更新；直接用表单数据更新本地状态
        await userAPI.updateProfile({
          name: this.data.formName,
          phone: this.data.formPhone,
          school: this.data.formSchool,
          college: this.data.formCollege,
          major: this.data.formMajor,
          grade: this.data.formGrade,
        });
        // 用表单数据更新 authStore，触发订阅回调刷新 UI
        authStore.updateUser({
          name: this.data.formName,
          phone: this.data.formPhone,
          school: this.data.formSchool,
          college: this.data.formCollege,
          major: this.data.formMajor,
          grade: this.data.formGrade,
        });
        this.setData({
          user: authStore.user,
          editMode: false,
        });
        hideLoading();
        showToast('保存成功', 'success');
      } catch (err: any) {
        hideLoading();
        showToast(err.message || '保存失败', 'error');
      }
    },

    togglePasswordForm() {
      this.setData({
        showPasswordForm: !this.data.showPasswordForm,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },

    onPwdInput(e: WechatMiniprogram.Input) {
      const field = e.currentTarget.dataset.field as string;
      if (field) this.setData({ [field]: e.detail.value });
    },

    async changePassword() {
      const { oldPassword, newPassword, confirmPassword } = this.data;
      if (!oldPassword) { showToast('请输入原密码', 'none'); return; }
      if (!newPassword || newPassword.length < 6) { showToast('新密码至少6位', 'none'); return; }
      if (newPassword !== confirmPassword) { showToast('两次密码不一致', 'none'); return; }

      showLoading('修改中...');
      try {
        await userAPI.changePassword(oldPassword, newPassword);
        hideLoading();
        showToast('密码修改成功', 'success');
        this.togglePasswordForm();
      } catch (err: any) {
        hideLoading();
        showToast(err.message || '修改失败', 'error');
      }
    },

    goMyProducts() {
      wx.switchTab({ url: '/pages/my-products/my-products' });
    },
    goOrders() {
      wx.switchTab({ url: '/pages/orders/orders' });
    },
    goFavorites() {
      wx.navigateTo({ url: '/pages/favorites/favorites' });
    },
  },
});
