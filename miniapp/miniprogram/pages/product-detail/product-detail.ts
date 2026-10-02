/**
 * 商品详情页
 */
import { productAPI } from '../../services/product';
import { orderAPI } from '../../services/order';
import { authStore } from '../../stores/auth-store';
import { buildFaceToFaceOrderRequest } from '../../utils/face-to-face-order';
import { resolveUrl } from '../../utils/http';
import { formatPrice, formatDate, showToast, showLoading, hideLoading } from '../../utils/format';
import type { ProductDTO, ReviewDTO } from '../../types/api';
import { CONDITION_MAP, PRODUCT_STATUS_MAP } from '../../types/api';

Component({
  properties: {
    id: { type: String, value: '' }
  },

  data: {
    product: null as ProductDTO | null,
    reviews: [] as ReviewDTO[],
    images: [] as string[],
    sellerAvatar: '',
    tagList: [] as string[],
    isAuthenticated: false,
    isOwner: false,
    isFavorited: false,
    loading: true,
    quantity: 1,
  },

  lifetimes: {
    attached() {
      this.setData({ isAuthenticated: authStore.isAuthenticated });
      this._loadProductById();
    },
  },

  pageLifetimes: {
    // 从 product-edit 返回时刷新商品数据
    show() {
      if (this.data.product) {
        this._loadProductById();
      }
    },
  },

  methods: {
    _loadProductById() {
      const pid = Number(this.properties.id);
      if (pid) {
        this.loadProduct(pid);
      } else {
        // fallback: try getCurrentPages
        const pages = getCurrentPages();
        const cp = pages[pages.length - 1] as any;
        const id = Number(cp?.options?.id || 0);
        if (id) this.loadProduct(id);
        else this.setData({ loading: false });
      }
    },

    async loadProduct(id: number) {
      try {
        const product = await productAPI.getProduct(id);
        const images = (product.images || []).map(img => resolveUrl(img));
        const sellerAvatar = resolveUrl(product.sellerAvatar);
        const isOwner = authStore.user?.id === product.sellerId;

        // Parse tags from product (could be JSON string or array)
        var tagList = [];
        var rawTags = (product as any).tags;
        if (Array.isArray(rawTags)) {
          tagList = rawTags;
        } else if (typeof rawTags === 'string' && rawTags) {
          try { var arr = JSON.parse(rawTags); tagList = Array.isArray(arr) ? arr : []; } catch (e) { tagList = []; }
        }

        this.setData({ product, images, sellerAvatar, tagList, isOwner, isFavorited: !!(product as any).isFavorited, loading: false });
        this.loadReviews(id);
      } catch {
        this.setData({ loading: false });
        showToast('加载失败', 'error');
      }
    },

    async loadReviews(productId: number) {
      try {
        const res = await productAPI.getProductReviews(productId);
        var reviews = (res.data || []).map(function(rv) {
          // Resolve reviewer avatar if available
          if (rv.reviewerAvatar) {
            rv.reviewerAvatar = resolveUrl(rv.reviewerAvatar);
          }
          // Format date for display
          if (rv.createdAt) {
            rv.createdAt = formatDate(rv.createdAt);
          }
          return rv;
        });
        this.setData({ reviews: reviews });
      } catch { /* ignore */ }
    },

    onPreviewImage(e: WechatMiniprogram.TouchEvent) {
      const url = e.currentTarget.dataset.url;
      wx.previewImage({ current: url, urls: this.data.images });
    },

    increaseQty() {
      const product = this.data.product;
      if (!product) return;
      if (this.data.quantity < product.stockQuantity) {
        this.setData({ quantity: this.data.quantity + 1 });
      }
    },

    decreaseQty() {
      if (this.data.quantity > 1) {
        this.setData({ quantity: this.data.quantity - 1 });
      }
    },

    async handleBuy() {
      if (!authStore.isAuthenticated) {
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
      const product = this.data.product;
      if (!product) return;
      const request = buildFaceToFaceOrderRequest(product.id, this.data.quantity, authStore.user);
      if (!request.ok) {
        showToast(
          request.reason === 'phone'
            ? '请先在个人资料中补全手机号'
            : '请先在个人资料中补全姓名或用户名',
          'none',
        );
        return;
      }

      showLoading('创建订单中...');
      try {
        await orderAPI.createOrder(request.data);
        hideLoading();
        showToast('下单成功', 'success');
        setTimeout(() => wx.navigateTo({ url: '/pages/orders/orders' }), 1000);
      } catch (err: any) {
        hideLoading();
        showToast(err.message || '下单失败', 'error');
      }
    },

    handleContactSeller() {
      if (!authStore.isAuthenticated) {
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
      const product = this.data.product;
      if (!product) return;
      wx.navigateTo({
        url: `/pages/chat/chat?userId=${product.sellerId}&productId=${product.id}`,
      });
    },

    async toggleFavorite() {
      if (!authStore.isAuthenticated) {
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
      const product = this.data.product;
      if (!product) return;
      try {
        if (this.data.isFavorited) {
          await productAPI.removeFavorite(product.id);
          this.setData({ isFavorited: false });
          showToast('已取消收藏', 'none');
        } else {
          await productAPI.addFavorite(product.id);
          this.setData({ isFavorited: true });
          showToast('已添加收藏', 'success');
        }
      } catch (err: any) {
        showToast(err.message || '操作失败', 'error');
      }
    },

    goEdit() {
      const product = this.data.product;
      if (!product) return;
      wx.navigateTo({ url: `/pages/product-edit/product-edit?id=${product.id}` });
    },
  },
});
