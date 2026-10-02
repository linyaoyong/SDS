/**
 * 商品列表/搜索页
 * 参照 frontend-v2/src/pages/Products.tsx
 */
import { productAPI } from '../../services/product';
import { authStore } from '../../stores/auth-store';
import { resolveUrl } from '../../utils/http';
import { formatPrice, showToast } from '../../utils/format';
import type { ProductDTO, CategoryDTO } from '../../types/api';
import { CONDITION_MAP } from '../../types/api';

Component({
  data: {
    products: [] as ProductDTO[],
    parentCategories: [] as CategoryDTO[],    // L1 分类
    childCategories: [] as CategoryDTO[],     // 当前选中 L1 下的 L2 分类
    selectedParentId: 0,
    keyword: '',
    selectedCategoryId: 0,  // 实际筛选用的 categoryId（L2 优先）
    page: 1,
    total: 0,
    loading: false,
    hasMore: true,
    favoriteIds: {} as Record<number, boolean>,  // 收藏状态集合
  },

  lifetimes: {
    attached() {
      this.loadCategories();
      this.loadProducts();
    },
  },
  methods: {
    onShow() {
      this.loadCategories();
      this.setData({ page: 1, products: [] });
      this.loadProducts(true);
    },
    async loadCategories() {
      try {
        const cats = await productAPI.getAllCategories();
        if (!cats || cats.length === 0) return;
        // L1: parentId === null 的
        const parents = cats.filter(c => c.parentId === null);
        this.setData({ parentCategories: parents });
      } catch { /* ignore */ }
    },

    async loadProducts(reset = false) {
      if (this.data.loading) return;
      const page = reset ? 1 : this.data.page;

      this.setData({ loading: true });

      try {
        const params: any = {
          page,
          size: 20,
        };
        if (this.data.keyword) params.keyword = this.data.keyword;
        if (this.data.selectedCategoryId) params.categoryId = this.data.selectedCategoryId;

        const res = await productAPI.getProducts(params);
        const products = reset ? res.data : [...this.data.products, ...res.data];
        // 同步后端返回的 isFavorited 到本地 favoriteIds 集合
        const favoriteIds = { ...this.data.favoriteIds };
        res.data.forEach(p => { favoriteIds[p.id] = !!(p as any).isFavorited; });
        this.setData({
          products,
          page: res.page,
          total: res.total,
          hasMore: products.length < res.total,
          loading: false,
          favoriteIds,
        });
      } catch {
        this.setData({ loading: false });
      }
    },

    onSearchInput(e: WechatMiniprogram.Input) {
      this.setData({ keyword: e.detail.value });
    },

    onSearch() {
      this.setData({ page: 1 });
      this.loadProducts(true);
    },

    onCategoryTap(e: WechatMiniprogram.TouchEvent) {
      const id = Number(e.currentTarget.dataset.id);
      const level = Number(e.currentTarget.dataset.level || 0);
      const name = e.currentTarget.dataset.name || '';

      // L1 分类：切换展开/收起 L2
      if (level === 0) {
        if (this.data.selectedParentId === id) {
          // 取消选中
          this.setData({ selectedParentId: 0, childCategories: [], selectedCategoryId: 0, page: 1 });
        } else {
          // 选中 L1，显示 L2
          const cat = this.data.parentCategories.find(c => c.id === id);
          this.setData({
            selectedParentId: id,
            childCategories: cat?.children || [],
            selectedCategoryId: id,  // 先用 L1 ID 筛选
            page: 1,
          });
        }
      } else {
        // L2 分类：直接筛选
        this.setData({
          selectedCategoryId: id === this.data.selectedCategoryId ? 0 : id,
          page: 1,
        });
      }
      this.loadProducts(true);
    },

    onLoadMore() {
      if (!this.data.hasMore || this.data.loading) return;
      this.setData({ page: this.data.page + 1 });
      this.loadProducts();
    },

    goDetail(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` });
    },

    async toggleFavorite(e: WechatMiniprogram.TouchEvent) {
      if (!authStore.isAuthenticated) {
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
      const id = Number(e.currentTarget.dataset.id);
      const isFav = !!this.data.favoriteIds[id];
      try {
        if (isFav) {
          await productAPI.removeFavorite(id);
          showToast('已取消收藏', 'none');
        } else {
          await productAPI.addFavorite(id);
          showToast('已添加收藏', 'success');
        }
        this.setData({ [`favoriteIds.${id}`]: !isFav });
      } catch (err: any) {
        showToast(err.message || '操作失败', 'error');
      }
    },

    onPullDownRefresh() {
      this.setData({ page: 1, products: [] });
      this.loadCategories();
      this.loadProducts(true);
      wx.stopPullDownRefresh();
    },
  },
});
