/**
 * 聊天窗口
 */
import { messageAPI } from '../../services/message';
import { productAPI } from '../../services/product';
import { authStore } from '../../stores/auth-store';
import { resolveUrl } from '../../utils/http';
import { showToast } from '../../utils/format';
import type { MessageDTO, ProductDTO } from '../../types/api';

Component({
  properties: {
    userId: { type: String, value: '' },
    productId: { type: String, value: '' }
  },

  data: {
    messages: [] as MessageDTO[],
    product: null as ProductDTO | null,
    inputText: '',
    otherUserId: 0,
    productIdNum: 0,
    loading: true,
    sending: false,
    currentUserId: 0,
    canSend: false,
    scrollTop: 0,
  },

  lifetimes: {
    attached() {
      if (!authStore.isAuthenticated) {
        wx.redirectTo({ url: '/pages/login/login' });
        return;
      }
      const uid = Number(this.properties.userId || 0);
      const pid = Number(this.properties.productId || 0);
      this.setData({
        otherUserId: uid,
        productIdNum: pid,
        currentUserId: authStore.user?.id || 0,
      });
      if (uid) {
        if (pid) {
          this.loadMessages();
          this.loadProduct(pid);
        } else {
          this.setData({ loading: false });
        }
      } else {
        this.setData({ loading: false });
      }
    },
  },

  pageLifetimes: {
    show() {
      // 每次显示刷新消息
      const uid = this.data.otherUserId;
      const pid = this.data.productIdNum;
      if (uid && pid && authStore.isAuthenticated) {
        this.loadMessages();
        this.markRead();
      }
    },
  },

  methods: {
    async loadProduct(id: number) {
      try {
        const product = await productAPI.getProduct(id);
        this.setData({ product });
      } catch {
        /* ignore */
      }
    },

    async markRead() {
      const pid = this.data.productIdNum;
      const uid = this.data.otherUserId;
      if (!pid || !uid) return;
      try {
        await messageAPI.markConversationRead(pid, uid);
      } catch {
        /* ignore */
      }
    },

    async loadMessages() {
      try {
        const msgs = await messageAPI.getMessages(
          this.data.otherUserId,
          this.data.productIdNum
        );
        // 按时间正序排列，最新的在底部
        const sorted = (msgs || []).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        this.setData({ messages: sorted, loading: false });
        // 滚动到底部最新消息：先设 0 再设大值，确保 scroll-top 变化触发滚动
        this.scrollToBottom();
      } catch {
        this.setData({ loading: false });
      }
    },

    scrollToBottom() {
      // 先重置为 0，下一帧再设一个很大的值，确保 scroll-view 一定滚到底
      this.setData({ scrollTop: 0 });
      wx.nextTick(() => {
        this.setData({ scrollTop: 9999999 });
      });
    },

    onInput(e: WechatMiniprogram.Input) {
      const text = e.detail.value;
      this.setData({
        inputText: text,
        canSend: !this.data.sending && !!text.trim(),
      });
    },

    goProduct() {
      const pid = this.data.productIdNum;
      if (pid) wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${pid}` });
    },

    async sendMessage() {
      const text = this.data.inputText.trim();
      if (!text || this.data.sending) return;

      this.setData({ sending: true, canSend: false });
      try {
        await messageAPI.sendMessage({
          receiverId: this.data.otherUserId,
          content: text,
          productId: this.data.productIdNum || 0,
        });
        this.setData({ inputText: '', sending: false, canSend: false });
        this.loadMessages();
      } catch (err: any) {
        showToast(err.message || '发送失败', 'error');
        this.setData({ sending: false, canSend: !!this.data.inputText.trim() });
      }
    },
  },
});
