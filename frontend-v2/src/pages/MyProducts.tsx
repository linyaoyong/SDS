import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { productAPI } from '../services/product';
import type { ProductDTO } from '../types/api';
import { PRODUCT_STATUS_MAP } from '../types/api';
import { Package, Pencil, Trash2, EyeOff, Eye, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { resolveUrl } from '../utils/api';

export default function MyProducts() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [items, setItems] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getProducts({ mine: true, page: 1, size: 50 });
      setItems(response.data);
    } catch (err: any) {
      toast.error(err?.message || '获取我的商品失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOffShelf = async (id: number) => {
    try {
      await productAPI.offShelf(id);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 3 } : i));
      toast.success('商品已下架');
    } catch (error: any) {
      toast.error(error?.message || '下架失败');
    }
  };

  const handleReList = async (id: number) => {
    try {
      await productAPI.reList(id);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 1 } : i));
      toast.success('商品已重新上架');
    } catch (error: any) {
      toast.error(error?.message || '上架失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await productAPI.deleteProduct(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('商品已删除');
    } catch (error: any) {
      toast.error(error?.message || '删除失败');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的商品</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">暂无商品，快去发布吧</p>
          <div className="mt-4">
            <button
              onClick={() => navigate('/publish')}
              className="inline-flex items-center space-x-2 bg-blue-600 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Package className="h-5 w-5" />
              <span>去发布</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(p => (
            <div key={p.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-start gap-4">
                {/* 商品图片 */}
                <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  {p.images && p.images[0] ? (
                    <img
                      src={resolveUrl(p.images[0])}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900 truncate flex items-center gap-2" title={p.title}>
                      {p.title}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 1 ? 'bg-green-100 text-green-700' :
                        p.status === 2 ? 'bg-gray-100 text-gray-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {PRODUCT_STATUS_MAP[p.status] || '未知'}
                      </span>
                    </div>
                    <div className="text-red-600 font-bold whitespace-nowrap">¥{p.price}</div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    浏览量 {p.viewCount} | 收藏 {p.favoriteCount}
                  </div>
                  <div className="text-sm text-gray-700 mt-2 line-clamp-2 break-words">{p.description}</div>
                </div>

                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {/* 在售 → 下架 + 编辑 */}
                  {p.status === 1 && (
                    <>
                      <button
                        onClick={() => handleOffShelf(p.id)}
                        className="p-2 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100"
                        title="下架"
                      >
                        <EyeOff className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/publish/${p.id}`)}
                        className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {/* 已售出 → 无操作 */}
                  {p.status === 2 && null}
                  {/* 已下架 → 重新上架 + 删除 */}
                  {p.status === 3 && (
                    <>
                      <button
                        onClick={() => handleReList(p.id)}
                        className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100"
                        title="重新上架"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 悬浮 "+" 发布按钮 — 移动端需避开底栏 (底栏约 54px，增加等量偏移) */}
      <button
        onClick={() => navigate('/publish')}
        className="fixed bottom-[86px] md:bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center z-50"
        title="发布商品"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
