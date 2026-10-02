import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productAPI } from '../services/product';
import type { ProductDTO, ProductCreateRequest } from '../types/api';
import { X, Plus, DollarSign, Package, Image as ImageIcon } from 'lucide-react';
import { CONDITION_MAP } from '../types/api';
import { toast } from 'sonner';
import { resolveUrl } from '../utils/api';

type ProductFormState = Omit<ProductCreateRequest, 'tags' | 'stockQuantity'> & { tags: string[]; stock: number };

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [formData, setFormData] = useState<ProductFormState>({
    title: '',
    description: '',
    price: 0,
    originalPrice: undefined,
    stock: 1,
    categoryId: 1,
    images: [],
    condition: 1,
    tags: []
  });

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedL1, setSelectedL1] = useState<number | null>(null);

  const loadedRef = useRef(false);

  useEffect(() => {
    // 防止 React StrictMode 重复调用 + user 变化时重复触发
    const pid = parseInt(id || '0');
    if (!pid || loadedRef.current) return;
    loadedRef.current = true;

    const load = async () => {
      try {
        setLoading(true);
        // 先加载分类树（await 确保分类数据就绪后再回显）
        const cats = await productAPI.getAllCategories();
        setCategories(cats || []);
        // 优先从"我的商品"中查找（确保是商品所有者才能编辑）
        const mineList = await productAPI.getProducts({ mine: true, page: 1, size: 200 });
        let data = mineList.data.find(p => p.id === pid) || null;
        // 如果我的商品中找不到，尝试直接获取
        if (!data) {
          data = await productAPI.getProduct(pid);
        }

        setProduct(data);
        // 解析 tags：后端可能返回 JSON 字符串或数组
        let parsedTags: string[] = [];
        const rawTags = (data as any).tags;
        if (Array.isArray(rawTags)) {
          parsedTags = rawTags;
        } else if (typeof rawTags === 'string' && rawTags) {
          try { const arr = JSON.parse(rawTags); parsedTags = Array.isArray(arr) ? arr : []; } catch { parsedTags = []; }
        }
        // 兼容 tagList
        if (parsedTags.length === 0 && Array.isArray((data as any).tagList)) {
          parsedTags = (data as any).tagList;
        }

        const catId = Number(data.categoryId) || 0;
        // 根据商品 categoryId 回显一级分类：若该 id 是二级分类，找到其 parentId
        let l1Id: number | null = null;
        if (catId) {
          const asL1 = (cats || []).find(c => c.id === catId);
          if (asL1) {
            // categoryId 本身就是一级分类
            l1Id = asL1.id;
          } else {
            // 在 children 中查找
            for (const c of (cats || [])) {
              const child = (c.children || []).find((sc: any) => sc.id === catId);
              if (child) { l1Id = c.id; break; }
            }
          }
        }
        setSelectedL1(l1Id);

        setFormData({
          title: data.title || '',
          description: data.description || '',
          price: Number(data.price) || 0,
          originalPrice: data.originalPrice as any,
          stock: Number((data as any).stockQuantity ?? data.stock) || 1,
          categoryId: catId,
          images: data.images || [],
          condition: Number(data.condition) || 1,
          tags: parsedTags,
          location: (data as any).location || '',
        } as any);
        setExistingImages(data.images || []);
      } catch {
        toast.error('加载商品失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]); // 移除 user 依赖，避免重复触发

  // 一级分类变化时重置二级分类
  const handleL1Change = (id: number | null) => {
    setSelectedL1(id);
    setFormData(prev => ({ ...prev, categoryId: 0 }));
  };

  const getL2Categories = (): any[] => {
    if (!selectedL1) return [];
    return categories.find(c => c.id === selectedL1)?.children || [];
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = URL.createObjectURL(file);
        newImages.push(imageUrl);
      }
      setUploadedImages(prev => [...prev, ...newImages]);
      setSelectedFiles(prev => [...prev, ...Array.from(files)]);
      toast.success(`已添加 ${files.length} 张图片待上传`);
    } catch (error) {
      toast.error('图片选择失败');
    } finally {
      setUploading(false);
    }
  };

  const removeLocalImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (index: number) => {
    if (!product) return;
    try {
      await productAPI.deleteProductImage(product.id, index);
      setExistingImages(prev => prev.filter((_, i) => i !== index));
      toast.success('已删除图片');
    } catch {
      toast.error('删除图片失败');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!formData.title.trim()) {
      toast.error('请输入商品标题');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('请输入商品描述');
      return;
    }
    if (formData.price <= 0) {
      toast.error('请输入有效的价格');
      return;
    }
    if (formData.stock <= 0) {
      toast.error('请输入有效的库存数量');
      return;
    }

    setSubmitting(true);
    try {
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        price: formData.price,
        originalPrice: formData.originalPrice,
        stockQuantity: formData.stock,
        condition: formData.condition,
        location: (formData as any).location || undefined,
      };
      if (formData.tags && formData.tags.length > 0) {
        updateData.tags = JSON.stringify(formData.tags);
      }
      if (existingImages.length > 0) {
        updateData.images = existingImages;
      }

      const updated = await productAPI.updateProduct(product.id, updateData);

      // 逐张上传新选择的图片
      if (selectedFiles.length > 0) {
        let uploadFailed = 0;
        for (const file of selectedFiles) {
          try {
            const imageUrl = await productAPI.uploadProductImage(updated.id, file);
            await productAPI.addProductImage(updated.id, imageUrl);
          } catch (err: any) {
            uploadFailed++;
            console.error('图片上传失败:', file.name, err);
          }
        }
        if (uploadFailed > 0) toast.warning(`${uploadFailed} 张图片上传失败，可稍后重试`);
      }

      toast.success('商品更新成功');
      navigate(`/products/${updated.id}`);
    } catch (error: any) {
      toast.error(error?.message || '商品更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">商品不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">编辑商品</h1>
          <p className="text-gray-600">修改商品信息并保存</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 lg:p-8">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              商品图片
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              {existingImages.map((image, index) => (
                <div key={`existing-${index}`} className="relative group">
                  <img
                    src={resolveUrl(image)}
                    alt={`商品图片 ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {uploadedImages.map((image, index) => (
                <div key={`new-${index}`} className="relative group">
                  <img
                    src={image}
                    alt={`商品图片 ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeLocalImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ImageIcon className="h-5 w-5 mr-2" />
                选择图片
              </button>
              <span className="text-sm text-gray-500">支持多张图片</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">商品标题</label>
              <input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="例如：九成新计算器"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                maxLength={50}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {formData.title.length}/50
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">商品分类</label>
              <div className="space-y-2">
                <select
                  value={selectedL1 || ''}
                  onChange={(e) => handleL1Change(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">选择一级分类</option>
                  {(categories || []).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {getL2Categories().length > 0 && (
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoryId: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">选择二级分类</option>
                    {getL2Categories().map((sc: any) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                )}
                {selectedL1 && getL2Categories().length === 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, categoryId: selectedL1 }))}
                    className={`w-full px-3 py-2 border rounded-md text-left ${
                      formData.categoryId === selectedL1
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    使用 &quot;{categories.find(c => c.id === selectedL1)?.name}&quot; 作为分类
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">价格</label>
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                <input
                  type="number"
                  value={formData.price as any}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  placeholder="例如：99"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">原价</label>
              <input
                type="number"
                value={formData.originalPrice as any || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: Number(e.target.value) }))}
                placeholder="例如：199"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">库存数量</label>
              <input
                type="number"
                value={formData.stock as any}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
                placeholder="例如：10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">面交地点</label>
              <input
                value={(formData as any).location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value } as any))}
                placeholder="例如：东校区图书馆门口"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">商品成色</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(val => (
                  <option key={val} value={val}>{CONDITION_MAP[val]}</option>
                ))}
                <option value={6}>其他</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">商品标签</label>
            <div className="flex gap-2 mb-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="例如：便携、耐用"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-2 text-blue-500 hover:text-blue-700">
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">商品描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {formData.description.length}/500
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/my-products')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
