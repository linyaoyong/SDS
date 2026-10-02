/**
 * 我的商品管理
 * 参照 frontend-v2/src/pages/MyProducts.tsx
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
      if (authStore.isAuthenticated) this.loadProducts(true);
      this._authCb = (d: any) => {
        this.setData({ isAuthenticated: d.isAuthenticated });
        if (d.isAuthenticated) this.loadProducts(true);
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
      this.setData({ isAuthenticated: isAuth });
      if (isAuth) this.loadProducts(true);
    },
    async loadProducts(reset = false) {
      const page = reset ? 1 : this.data.page;
      this.setData({ loading: true });

      try {
        const res = await productAPI.getProducts({ mine: true, page, size: 20 });
        const products = reset ? res.data : [...this.data.products, ...res.data];
        this.setData({
          products,
          page: res.page,
          total: res.total,
          hasMore: products.length < res.total,
          loading: false,
        });
      } catch {
        this.setData({ loading: false }); console.error('my-products load error'); wx.showToast({ title: '加载失败', icon: 'none', duration: 3000 });
      }
    },

    async handleAction(e: WechatMiniprogram.TouchEvent) {
      const { action, id } = e.currentTarget.dataset;
      try {
        switch (action) {
          case 'off':
            await productAPI.offShelf(id);
            showToast('已下架', 'success');
            break;
          case 'list':
            await productAPI.reList(id);
            showToast('已上架', 'success');
            break;
          case 'delete':
            const confirmed = await new Promise(resolve => {
              wx.showModal({ title: '确认删除', content: '删除后不可恢复', success: r => resolve(r.confirm) });
            });
            if (!confirmed) return;
            await productAPI.deleteProduct(id);
            showToast('已删除', 'success');
            break;
          case 'edit':
            wx.navigateTo({ url: `/pages/product-edit/product-edit?id=${id}` });
            return;
        }
        this.loadProducts(true);
      } catch (err: any) {
        showToast(err.message || '操作失败', 'error');
      }
    },

    goPublish() {
      wx.navigateTo({ url: '/pages/product-create/product-create' });
    },

    goLogin() {
      wx.navigateTo({ url: '/pages/login/login' });
    },
  },
});
