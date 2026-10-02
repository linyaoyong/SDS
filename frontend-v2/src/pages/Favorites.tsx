import { useEffect, useState } from 'react';
import { productAPI } from '../services/product';
import type { ProductDTO } from '../types/api';
import { ProductCard } from '../components/ProductCard';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Favorites() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async (p: number = 1) => {
    try {
      if (p === 1) setLoading(true);
      const response = await productAPI.getMyFavorites(p, PAGE_SIZE);
      if (p === 1) {
        setProducts(response.data);
      } else {
        setProducts(prev => [...prev, ...response.data]);
      }
      setHasMore(response.data.length >= PAGE_SIZE);
      setPage(p);
    } catch (error) {
      toast.error('获取收藏列表失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleUnfavorite = async (productId: number) => {
    try {
      await productAPI.removeFavorite(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('已取消收藏');
    } catch (error) {
      toast.error('操作失败');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">我的收藏</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">我的收藏</h1>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="h-12 w-12 text-pink-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无收藏</h3>
          <p className="text-gray-600">去商品页看看，喜欢就点收藏吧～</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorited={true}
                onFavorite={handleUnfavorite}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => { setLoadingMore(true); fetchFavorites(page + 1); }}
                disabled={loadingMore}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 shadow-sm"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>加载中...</span>
                  </>
                ) : (
                  <span>加载更多</span>
                )}
              </button>
            </div>
          )}
          {!hasMore && products.length > 0 && (
            <div className="mt-8 text-center text-gray-500 text-sm">已经到底啦 ~</div>
          )}
        </>
      )}
    </div>
  );
}
