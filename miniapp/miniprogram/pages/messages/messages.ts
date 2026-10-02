/**
 * 消息会话列表
 * 参照 frontend-v2/src/pages/Messages.tsx
 */
import { messageAPI } from '../../services/message';
import { authStore } from '../../stores/auth-store';
import { resolveUrl } from '../../utils/http';
import { formatDateTime, truncate } from '../../utils/format';
import type { ConversationDTO } from '../../types/api';

Component({
  data: {
    conversations: [] as ConversationDTO[],
    unreadCount: 0,
    loading: true,
    isAuthenticated: false,
  },

  pageLifetimes: {
    show() {
      const isAuth = authStore.isAuthenticated;
      this.setData({ isAuthenticated: isAuth });
      if (isAuth) this.loadConversations();
    },
  },

  lifetimes: {
    attached() {
      this.setData({ isAuthenticated: authStore.isAuthenticated });
      if (authStore.isAuthenticated) {
        this.loadConversations();
      }
      // 订阅 auth 变化
      this._authCb = (d: any) => {
        this.setData({ isAuthenticated: d.isAuthenticated });
        if (d.isAuthenticated) this.loadConversations();
      };
      authStore.subscribe(this._authCb);
    },
    detached() {
      if (this._authCb) authStore.unsubscribe(this._authCb);
    },
  },

  methods: {
    async loadConversations() {
      if (!authStore.isAuthenticated) return;
      try {
        const [convs, unread] = await Promise.all([
          messageAPI.getConversations(),
          messageAPI.getUnreadCount(),
        ]);
        this.setData({ conversations: convs || [], unreadCount: unread || 0, loading: false });
      } catch {
        this.setData({ loading: false }); console.error('messages load error'); wx.showToast({ title: '加载失败', icon: 'none', duration: 3000 });
      }
    },

    goChat(e: WechatMiniprogram.TouchEvent) {
      const { userId, productId } = e.currentTarget.dataset;
      wx.navigateTo({
        url: `/pages/chat/chat?userId=${userId}&productId=${productId || 0}`,
      });
    },

    goLogin() {
      wx.navigateTo({ url: '/pages/login/login' });
    },
  },
});
