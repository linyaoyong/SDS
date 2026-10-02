/**
 * 我的收藏
 * 参照 frontend-v2/src/pages/Favorites.tsx
 */
import { productAPI } from '../../services/product';
import { authStore } from '../../stores/auth-store';
import { resolveUrl } from '../../utils/http';
import { formatPrice, showToast } from '../../utils/format';
import type { ProductDTO } from '../../types/api';
import { CONDITION_MAP } from '../../types/api';

Component({
  data: {
    products: [] as ProductDTO[],
    page: 1,
    total: 0,
    loading: true,
    hasMore: true,
    isAuthenticated: false,
  },

  lifetimes: {
    attached() {
      this.setData({ isAuthenticated: authStore.isAuthenticated });
      this._authCb = (d: any) => {
        this.setData({ isAuthenticated: d.isAuthenticated });
        if (d.isAuthenticated) this.loadFavorites(true);
      };
      authStore.subscribe(this._authCb);
    },
    detached() {
      if (this._authCb) authStore.unsubscribe(this._authCb);
    },
  },

  // pageLifetimes 确保页面每次显示时重新加载（该页非 Tab 页，通过 navigateTo 进入）
  pageLifetimes: {
    show() {
      const isAuth = authStore.isAuthenticated;
      this.setData({ isAuthenticated: isAuth });
      if (isAuth) this.loadFavorites(true);
    },
  },

  methods: {
    async loadFavorites(reset?: boolean) {
      const doReset = reset === true;
      const page = doReset ? 1 : this.data.page;
      this.setData({ loading: true });

      try {
        const res = await productAPI.getFavorites(page);
        const products = doReset ? res.data : [...this.data.products, ...res.data];
        this.setData({
          products,
          page: res.page,
          total: res.total,
          hasMore: products.length < res.total,
          loading: false,
        });
      } catch {
        this.setData({ loading: false }); console.error('favorites load error'); wx.showToast({ title: '加载失败', icon: 'none', duration: 3000 });
      }
    },

    async removeFavorite(e: WechatMiniprogram.TouchEvent) {
      const id = Number(e.currentTarget.dataset.id);
      try {
        await productAPI.removeFavorite(id);
        this.setData({
          products: this.data.products.filter(p => p.id !== id),
        });
        showToast('已取消收藏', 'success');
      } catch (err: any) {
        showToast(err.message || '操作失败', 'error');
      }
    },

    goDetail(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` });
    },

    goLogin() {
      wx.navigateTo({ url: '/pages/login/login' });
    },
  },
});
