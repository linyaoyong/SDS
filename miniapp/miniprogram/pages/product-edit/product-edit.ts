/**
 * 编辑商品
 */
import { productAPI } from '../../services/product';
import { authStore } from '../../stores/auth-store';
import { resolveUrl } from '../../utils/http';
import { showToast, showLoading, hideLoading } from '../../utils/format';
import { appendTag, removeTagAt } from '../../utils/tags';
import type { ProductDTO, CategoryDTO } from '../../types/api';

Component({
  properties: { id: { type: String, value: '' } },

  data: {
    productId: 0,
    title: '', description: '', price: '', originalPrice: '',
    stockQuantity: '1', condition: 10, conditionLabel: '全新',
    parentCategories: [] as CategoryDTO[],
    childCategories: [] as CategoryDTO[],
    allCategories: [] as CategoryDTO[],
    selectedParentId: 0, selectedCategoryId: 0, selectedCategoryName: '',
    tags: [] as string[], tagInput: '',
    images: [] as string[], existingImages: [] as string[],
    loading: true, submitting: false,
  },

  lifetimes: {
    attached() {
      if (!authStore.isAuthenticated) { wx.redirectTo({ url: '/pages/login/login' }); return; }
      this.loadCategories();
      const pid = Number(this.properties.id) || 0;
      if (pid) this.loadProduct(pid); else this.setData({ loading: false });
    },
  },

  methods: {
    async loadCategories() {
      try {
        var cats = await productAPI.getAllCategories();
        if (!cats || cats.length === 0) return;
        var parents = cats.filter(function(c) { return c.parentId === null; });
        this.setData({ parentCategories: parents, allCategories: cats });
      } catch (e) { /* ignore */ }
    },

    async loadProduct(id: number) {
      try {
        const p = await productAPI.getProduct(id);
        // 加载分类树并定位当前分类
        const cats = await productAPI.getAllCategories();
        const parents = cats?.filter(c => c.parentId === null) || [];
        var children = []; var parentId = 0;
        // 如果当前分类是 L2，找到其父 L1
        const currentCat = cats?.find(c => c.id === p.categoryId);
        if (currentCat?.parentId) {
          parentId = currentCat.parentId;
          children = cats?.filter(c => c.parentId === parentId) || [];
        } else if (currentCat && !currentCat.parentId) {
          // 当前是 L1，加载其 children
          parentId = currentCat.id;
          children = cats?.filter(c => c.parentId === parentId) || [];
        }
        // 解析 tags
        var tagList = [];
        if (p.tags) {
          if (typeof p.tags === 'string') {
            try { tagList = JSON.parse(p.tags); } catch (e) { tagList = p.tags.split(',').map(t => t.trim()).filter(Boolean); }
          } else if (Array.isArray(p.tags)) {
            tagList = p.tags;
          }
        }
        this.setData({
          productId: p.id, title: p.title || '', description: p.description || '',
          price: String(p.price || ''), originalPrice: p.originalPrice ? String(p.originalPrice) : '',
          stockQuantity: String(p.stockQuantity || 1), condition: p.condition || 10,
          conditionLabel: this._condLabel(p.condition || 10),
          selectedParentId: parentId, selectedCategoryId: p.categoryId,
          selectedCategoryName: currentCat?.name || p.categoryName || '',
          parentCategories: parents, childCategories: children,
          allCategories: cats,
          tags: tagList, existingImages: (p.images || []).map(img => resolveUrl(img)),
          loading: false,
        });
      } catch (err: any) {
        this.setData({ loading: false });
        showToast(err.message || '加载失败', 'error');
      }
    },

    _condLabel(c: number): string {
      const map: Record<number, string> = {10:'全新',9:'99新',8:'95新',7:'9成新',6:'85新',5:'8成新',4:'7成新',3:'6成新',2:'5成新',1:'1成新'};
      return map[c] || '全新';
    },

    // 表单输入
    onInput(e: any) { const f = e.currentTarget.dataset.field; if (f) this.setData({ [f]: e.detail.value }); },

    // 成色切换
    cycleCondition() {
      const keys = [10,9,8,7,6,5,4,3,2,1];
      const idx = keys.indexOf(this.data.condition);
      const next = keys[(idx + 1) % keys.length];
      this.setData({ condition: next, conditionLabel: this._condLabel(next) });
    },

    // 一级分类选择
    selectParent(e: any) {
      var id = Number(e.currentTarget.dataset.id);
      var name = e.currentTarget.dataset.name || '';
      if (id === this.data.selectedParentId) {
        this.setData({ selectedParentId: 0, childCategories: [], selectedCategoryId: 0, selectedCategoryName: '' });
      } else {
        // 从 allCategories 中按 parentId 筛选二级分类，同时尝试 cat.children
        var cats = this.data.allCategories;
        var children = [];
        if (cats && cats.length > 0) {
          // 先尝试从已有 flat 数据中筛选
          var flatChildren = cats.filter(function(c) { return c.parentId === id; });
          if (flatChildren.length > 0) {
            children = flatChildren;
          } else {
            // 退回到 tree children
            var cat = this.data.parentCategories.find(function(c) { return c.id === id; });
            children = cat?.children || [];
          }
        }
        // 如果 L1 有子分类，只设置 parentId 和 childCategories，不清空 selectedCategoryId
        // 让用户通过 selectChild 选择二级分类
        if (children.length > 0) {
          this.setData({
            selectedParentId: id, childCategories: children,
            selectedCategoryId: 0, selectedCategoryName: '',
          });
        } else {
          // L1 无子分类，直接用 L1 作为分类
          this.setData({
            selectedParentId: id, childCategories: children,
            selectedCategoryId: id, selectedCategoryName: name,
          });
        }
      }
    },

    // 二级分类选择
    selectChild(e: any) {
      const id = Number(e.currentTarget.dataset.id);
      const name = e.currentTarget.dataset.name || '';
      this.setData({
        selectedCategoryId: id === this.data.selectedCategoryId ? 0 : id,
        selectedCategoryName: id === this.data.selectedCategoryId ? (this.data.parentCategories.find(c => c.id === this.data.selectedParentId)?.name || '') : name,
      });
    },

    // 标签管理
    onTagInput(e: any) { this.setData({ tagInput: e.detail.value }); },
    addTag() {
      const r = appendTag(this.data.tags, this.data.tagInput);
      if (r.error === 'duplicate') { showToast('标签已存在', 'none'); return; }
      if (r.error === 'max') { showToast('最多10个标签', 'none'); return; }
      this.setData({ tags: r.tags, tagInput: '' });
    },
    removeTag(e: any) {
      this.setData({ tags: removeTagAt(this.data.tags, Number(e.currentTarget.dataset.index)) });
    },

    // 图片
    chooseImages() {
      const remain = 9 - this.data.images.length - this.data.existingImages.length;
      if (remain <= 0) { showToast('最多9张图片', 'none'); return; }
      wx.chooseImage({ count: remain, sizeType: ['compressed'], sourceType: ['album', 'camera'],
        success: (res) => this.setData({ images: [...this.data.images, ...res.tempFilePaths] }),
      });
    },
    removeNewImage(e: any) { const i = Number(e.currentTarget.dataset.index); const imgs = [...this.data.images]; imgs.splice(i,1); this.setData({images:imgs}); },
    async removeExistingImage(e: any) {
      const idx = Number(e.currentTarget.dataset.index);
      try {
        await productAPI.deleteProductImage(this.data.productId, idx);
        const imgs = [...this.data.existingImages]; imgs.splice(idx,1);
        this.setData({ existingImages: imgs });
      } catch (err: any) { showToast(err.message || '删除失败', 'error'); }
    },

    // 提交
    async handleSubmit() {
      const { title, price, submitting, productId, selectedCategoryId } = this.data;
      if (submitting || !productId) return;
      if (!title.trim()) { showToast('请输入标题', 'none'); return; }
      if (!price || Number(price) <= 0) { showToast('请输入价格', 'none'); return; }
      if (!selectedCategoryId) { showToast('请选择分类', 'none'); return; }
      const tagResult = appendTag(this.data.tags, this.data.tagInput);
      if (tagResult.error === 'duplicate') { showToast('标签已存在', 'none'); return; }
      if (tagResult.error === 'max') { showToast('最多10个标签', 'none'); return; }
      if (tagResult.added) this.setData({ tags: tagResult.tags, tagInput: '' });

      this.setData({ submitting: true });
      showLoading('保存中...');
      try {
        // 直接更新商品，无需先下架（offShelf 会导致在售商品被强制下架）
        await productAPI.updateProduct(productId, {
          title: title.trim(), description: this.data.description.trim(),
          categoryId: selectedCategoryId, price: Number(price),
          originalPrice: this.data.originalPrice ? Number(this.data.originalPrice) : undefined,
          stockQuantity: Number(this.data.stockQuantity) || 1,
          condition: this.data.condition, tags: tagResult.tags, images: [],
        });
        for (const fp of this.data.images) {
          try { const url = await productAPI.uploadProductImage(productId, fp); await productAPI.addProductImage(productId, url); } catch {}
        }
        hideLoading(); showToast('保存成功', 'success');
        // 延迟返回，保持 submitting=true 防止重复提交
        setTimeout(() => {
          this.setData({ submitting: false });
          wx.navigateBack();
        }, 1000);
      } catch (err: any) {
        hideLoading(); showToast(err.message || '保存失败', 'error');
        this.setData({ submitting: false });
      }
    },
  },
});
