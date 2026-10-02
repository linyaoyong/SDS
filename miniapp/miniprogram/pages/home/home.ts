/**
 * 首页 — 快捷入口 + 热门/最新商品
 * 参照 frontend-v2/src/pages/Home.tsx
 */
import { productAPI } from '../../services/product';
import { authStore } from '../../stores/auth-store';
import { resolveUrl } from '../../utils/http';
import { formatPrice } from '../../utils/format';
import type { ProductDTO } from '../../types/api';
import { CONDITION_MAP } from '../../types/api';

Component({
  data: {
    isAuthenticated: false,
    hotProducts: [] as ProductDTO[],
    latestProducts: [] as ProductDTO[],
    loading: true,
  },

  lifetimes: {
    attached() {
      this.setData({ isAuthenticated: authStore.isAuthenticated });
      this._authListener = (data: any) => {
        this.setData({ isAuthenticated: data.isAuthenticated });
      };
      authStore.subscribe(this._authListener);
      this.loadData();
    },
    detached() {
      if (this._authListener) {
        authStore.unsubscribe(this._authListener);
      }
    },
  },

  methods: {
    async loadData() {
      try {
        const [hot, latest] = await Promise.all([
          productAPI.getHotProducts(6),
          productAPI.getLatestProducts(6),
        ]);
        this.setData({ hotProducts: hot, latestProducts: latest, loading: false });
      } catch {
        this.setData({ loading: false });
      }
    },

    onRefresh() {
      this.setData({ loading: true });
      this.loadData();
    },

    /** 跳转商品详情 */
    goDetail(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` });
    },

    goLogin() {
      wx.navigateTo({ url: '/pages/login/login' });
    },

    goRegister() {
      wx.navigateTo({ url: '/pages/register/register' });
    },

    goPublish() {
      if (!authStore.isAuthenticated) {
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
      wx.navigateTo({ url: '/pages/product-create/product-create' });
    },

    goMyProducts() {
      if (!authStore.isAuthenticated) {
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
      wx.switchTab({ url: '/pages/my-products/my-products' });
    },

    goFavorites() {
      if (!authStore.isAuthenticated) {
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
      wx.navigateTo({ url: '/pages/favorites/favorites' });
    },

    goOrders() {
      if (!authStore.isAuthenticated) {
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
      wx.switchTab({ url: '/pages/orders/orders' });
    },

    goMessages() {
      if (!authStore.isAuthenticated) {
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
      wx.switchTab({ url: '/pages/messages/messages' });
    },

    // 模板辅助函数（在 WXML 中通过 WXS 调用）
  },
});
