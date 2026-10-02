import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productAPI } from '../services/product';
import type { ProductCreateRequest, CategoryDTO } from '../types/api';
import { CONDITION_MAP } from '../types/api';
import { X, Plus, DollarSign, Package, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductCreate() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProductCreateRequest>({
    title: '',
    description: '',
    price: 0,
    originalPrice: undefined,
    stockQuantity: 1,
    categoryId: 0,
    condition: 8,
    tags: [],
    location: '',
    images: [],
  });

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [selectedL1, setSelectedL1] = useState<number | null>(null);

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Load categories on mount
  useEffect(() => {
    productAPI.getAllCategories()
      .then(cats => {
        setCategories(cats);
        if (cats.length === 0) {
          toast.error('商品分类数据为空，请联系管理员');
        }
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
        toast.error('商品分类加载失败，请刷新页面重试');
      });
  }, []);

  // Reset categoryId when L1 changes
  const handleL1Change = (id: number | null) => {
    setSelectedL1(id);
    setFormData(prev => ({ ...prev, categoryId: 0 }));
  };

  // 后端已返回树形结构：根节点即一级分类，children 即二级分类，且 SQL 已过滤 status=1
  const getL1Categories = () => categories;
  const getL2Categories = () => {
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
        newImages.push(URL.createObjectURL(files[i]));
      }
      setUploadedImages(prev => [...prev, ...newImages]);
      setSelectedFiles(prev => [...prev, ...Array.from(files)]);
      toast.success(`已添加 ${files.length} 张图片待上传`);
    } catch (error) {
      toast.error('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !formData.tags?.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), trimmed],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) { toast.error('请输入商品标题'); return; }
    if (!formData.description.trim()) { toast.error('请输入商品描述'); return; }
    if (formData.price <= 0) { toast.error('请输入有效的价格'); return; }
    if (!formData.categoryId) { toast.error('请选择商品分类'); return; }
    if (formData.stockQuantity <= 0) { toast.error('请输入有效的库存数量'); return; }

    setSubmitting(true);
    try {
      const productData: ProductCreateRequest = {
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        price: formData.price,
        originalPrice: formData.originalPrice,
        stockQuantity: formData.stockQuantity,
        condition: formData.condition,
        tags: formData.tags,
        location: formData.location || undefined,
        images: [],
      };

      const newProduct = await productAPI.createProduct(productData);

      // 逐张上传图片到已创建的商品
      if (selectedFiles.length > 0) {
        let uploadFailed = 0;
        for (const file of selectedFiles) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            // 上传图片获取 URL，然后关联到商品
            const imageUrl = await productAPI.uploadProductImage(newProduct.id, file);
            await productAPI.addProductImage(newProduct.id, imageUrl);
          } catch (err: any) {
            uploadFailed++;
            const msg = err?.message || err?.response?.data?.message || String(err);
            console.error('图片上传失败:', file.name, msg);
            toast.error(`图片 ${file.name} 上传失败: ${msg}`);
          }
        }
        if (uploadFailed > 0) {
          toast.warning(`${uploadFailed} 张图片上传失败，可稍后在编辑中补传`);
        }
      }

      toast.success('商品发布成功！');
      navigate(`/products/${newProduct.id}`);
    } catch (error: any) {
      toast.error(error?.message || '商品发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const l1Categories = getL1Categories();
  const l2Categories = getL2Categories();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">发布商品</h1>
          <p className="text-gray-600">填写商品信息，发布您的闲置物品</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 lg:p-8">
          {/* 商品图片上传 - 位于表单最顶部 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              商品图片 <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`商品图片 ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {uploadedImages.length < 9 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">上传图片</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <p className="text-sm text-gray-500">
              最多可上传 9 张图片，建议尺寸 800x800 像素以上
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧表单项 */}
            <div className="space-y-6">
              {/* 商品标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商品标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入商品标题，建议包含品牌、型号等关键信息"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  maxLength={50}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {formData.title.length}/50
                </div>
              </div>

              {/* 商品价格 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  价格 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* 原价 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  原价（可选）
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.originalPrice || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: Number(e.target.value) || undefined }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 库存 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  库存数量 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.stockQuantity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: Number(e.target.value) }))}
                    placeholder="1"
                    min="1"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 右侧表单项 */}
            <div className="space-y-6">
              {/* 商品成色 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商品成色
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData(prev => ({ ...prev, condition: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(val => (
                    <option key={val} value={val}>
                      {CONDITION_MAP[val]}
                    </option>
                  ))}
                </select>
              </div>

              {/* 分类: 两级选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商品分类 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    value={selectedL1 || ''}
                    onChange={(e) => handleL1Change(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">选择一级分类</option>
                    {l1Categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {l2Categories.length > 0 && (
                    <select
                      value={formData.categoryId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, categoryId: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">选择二级分类</option>
                      {l2Categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  {selectedL1 && l2Categories.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, categoryId: selectedL1 }));
                      }}
                      className={`w-full px-3 py-2 border rounded-md text-left ${
                        formData.categoryId === selectedL1
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      使用 &quot;{l1Categories.find(c => c.id === selectedL1)?.name}&quot; 作为分类
                    </button>
                  )}
                </div>
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商品标签
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="添加标签"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.tags || []).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 位置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  交易位置（可选）
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="如：学校西门、图书馆三楼"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 商品描述 */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商品描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="请详细描述商品信息，包括使用情况、功能特点、购买渠道等..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {formData.description.length}/500
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '发布中...' : '发布商品'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
