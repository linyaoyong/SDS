/**
 * 发布商品页
 * 参照 frontend-v2/src/pages/ProductCreate.tsx
 */
import { productAPI } from '../../services/product';
import { authStore } from '../../stores/auth-store';
import { showToast, showLoading, hideLoading } from '../../utils/format';
import { CONDITION_MAP } from '../../types/api';
import { appendTag, removeTagAt } from '../../utils/tags';
import type { CategoryDTO } from '../../types/api';

Component({
  data: {
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    stockQuantity: '1',
    condition: 10,
    conditionText: '全新',
    selectedCategoryId: 0,
    selectedCategoryName: '请选择分类',
    categories: [] as CategoryDTO[],
    // 两级分类选择
    selectedL1Id: 0,
    selectedL1Name: '',
    l2Categories: [] as CategoryDTO[],
    tags: [] as string[], tagInput: '',
    images: [] as string[],
    showCategoryPicker: false,
    submitting: false,
    isAuthenticated: false,
  },

  lifetimes: {
    attached() {
      if (!authStore.isAuthenticated) {
        wx.redirectTo({ url: '/pages/login/login' });
        return;
      }
      this.setData({ isAuthenticated: true });
      this.loadCategories();
    },
  },

  methods: {
    async loadCategories() {
      try {
        const cats = await productAPI.getAllCategories();
        this.setData({ categories: cats || [] });
      } catch { /* ignore */ }
    },

    onInput(e: WechatMiniprogram.Input) {
      const field = e.currentTarget.dataset.field as string;
      if (field) {
        this.setData({ [field]: e.detail.value });
      }
    },

    onConditionChange(e: WechatMiniprogram.PickerChange) {
      const idx = Number(e.detail.value);
      const keys = Object.keys(CONDITION_MAP).map(Number);
      const cond = keys[idx];
      this.setData({ condition: cond, conditionText: CONDITION_MAP[cond] });
    },

    toggleCategoryPicker() {
      this.setData({ showCategoryPicker: !this.data.showCategoryPicker });
    },

    // 选择一级分类：展示对应二级分类
    selectL1(e: WechatMiniprogram.TouchEvent) {
      const id = Number(e.currentTarget.dataset.id);
      const name = e.currentTarget.dataset.name as string;
      const l1 = this.data.categories.find(c => c.id === id);
      const l2 = (l1?.children || []) as CategoryDTO[];
      this.setData({
        selectedL1Id: id,
        selectedL1Name: name,
        l2Categories: l2,
        // 重置二级选择，但若该一级分类无子分类，则直接选中一级
        selectedCategoryId: l2.length > 0 ? 0 : id,
        selectedCategoryName: l2.length > 0 ? '请选择二级分类' : name,
      });
    },

    // 选择二级分类
    selectL2(e: WechatMiniprogram.TouchEvent) {
      const id = Number(e.currentTarget.dataset.id);
      const name = e.currentTarget.dataset.name as string;
      this.setData({
        selectedCategoryId: id,
        selectedCategoryName: this.data.selectedL1Name + ' / ' + name,
        showCategoryPicker: false,
      });
    },
    onTagInput(e: WechatMiniprogram.Input) { this.setData({ tagInput: e.detail.value }); },
    addTag() { const r = appendTag(this.data.tags, this.data.tagInput); if (r.error === 'duplicate') { showToast('标签已存在', 'none'); return; } if (r.error === 'max') { showToast('最多10个标签', 'none'); return; } this.setData({ tags: r.tags, tagInput: '' }); },
    removeTag(e: WechatMiniprogram.TouchEvent) { this.setData({ tags: removeTagAt(this.data.tags, Number(e.currentTarget.dataset.index)) }); },

    chooseImages() {
      wx.chooseImage({
        count: 9 - this.data.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.setData({
            images: [...this.data.images, ...res.tempFilePaths],
          });
        },
      });
    },

    removeImage(e: WechatMiniprogram.TouchEvent) {
      const idx = Number(e.currentTarget.dataset.index);
      const images = [...this.data.images];
      images.splice(idx, 1);
      this.setData({ images });
    },

    async handleSubmit() {
      const { title, description, price, originalPrice, stockQuantity, condition, selectedCategoryId, submitting } = this.data;
      if (submitting) return;

      if (!title.trim()) { showToast('请输入标题', 'none'); return; }
      if (!selectedCategoryId) { showToast('请选择分类', 'none'); return; }
      if (!price || Number(price) <= 0) { showToast('请输入有效价格', 'none'); return; }
      const tagResult = appendTag(this.data.tags, this.data.tagInput);
      if (tagResult.error === 'duplicate') { showToast('标签已存在', 'none'); return; }
      if (tagResult.error === 'max') { showToast('最多10个标签', 'none'); return; }
      if (tagResult.added) this.setData({ tags: tagResult.tags, tagInput: '' });

      this.setData({ submitting: true });
      showLoading('发布中...');

      try {
        const product = await productAPI.createProduct({
          title: title.trim(),
          description: description.trim(),
          categoryId: selectedCategoryId,
          price: Number(price),
          originalPrice: originalPrice ? Number(originalPrice) : undefined,
          stockQuantity: Number(stockQuantity) || 1,
          condition,
          tags: tagResult.tags,
          images: [],
        });

        // 上传图片
        for (const filePath of this.data.images) {
          try {
            const url = await productAPI.uploadProductImage(product.id, filePath);
            await productAPI.addProductImage(product.id, url);
          } catch { /* skip failed uploads */ }
        }

        hideLoading();
        showToast('发布成功', 'success');
        setTimeout(() => {
          wx.switchTab({ url: '/pages/products/products' });
        }, 1000);
      } catch (err: any) {
        hideLoading();
        showToast(err.message || '发布失败', 'error');
        this.setData({ submitting: false });
      }
    },
  },
});
