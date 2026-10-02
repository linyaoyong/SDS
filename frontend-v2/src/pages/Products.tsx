import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { productAPI } from '../services/product';
import { ProductCard } from '../components/ProductCard';
import type { ProductDTO, CategoryDTO } from '../types/api';
import { Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [keyword, setKeyword] = useState('');
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [selectedL1, setSelectedL1] = useState<number | null>(null);

  // Pagination — pages start at 1
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  // L1 分类（根节点），L2 为选中 L1 的 children
  const l1Categories = useMemo(() => categories, [categories]);
  const l2Categories = useMemo(() => {
    if (!selectedL1) return [];
    return categories.find(c => c.id === selectedL1)?.children || [];
  }, [categories, selectedL1]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Re-fetch when category changes
  useEffect(() => {
    fetchProducts();
    fetchFavorites();
  }, [activeCategory]);

  const buildParams = (p: number) => {
    const params: Record<string, any> = { page: p, size: PAGE_SIZE };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (typeof activeCategory === 'number') {
      params.categoryId = activeCategory;
    }
    return params;
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setPage(1);
      const res = await productAPI.getProducts(buildParams(1));
      setProducts(res.data);
      setHasMore(res.data.length >= PAGE_SIZE);
    } catch (error) {
      toast.error('获取商品列表失败');
      console.error('获取商品列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const res = await productAPI.getProducts({ ...buildParams(nextPage) });
      setProducts(prev => [...prev, ...res.data]);
      setHasMore(res.data.length >= PAGE_SIZE);
      setPage(nextPage);
    } catch (error) {
      toast.error('加载更多失败');
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await productAPI.getMyFavorites(1, 100);
      setFavorites(new Set(res.data.map(p => p.id)));
    } catch (error) {
      // ignore
    }
  };

  const handleFavorite = async (productId: number) => {
    try {
      if (favorites.has(productId)) {
        await productAPI.removeFavorite(productId);
        setFavorites(prev => { const s = new Set(prev); s.delete(productId); return s; });
        toast.success('已取消收藏');
      } else {
        await productAPI.addFavorite(productId);
        setFavorites(prev => new Set(prev).add(productId));
        toast.success('已添加收藏');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const fetchCategories = async () => {
    try {
      const list = await productAPI.getAllCategories();
      setCategories(list || []);
    } catch (e) {
      // ignore
    }
  };

  const applyFilter = (catId: number | 'all') => {
    setActiveCategory(catId);
    setKeyword('');
    // 判断选中的是 L1 还是 L2
    const isL1 = categories.some(c => c.id === catId);
    if (catId === 'all' || isL1) {
      setSelectedL1(catId === 'all' ? null : catId);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">商品市场</h1>
          <p className="text-gray-600">发现校园内的优质二手商品</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex items-center w-full sm:w-80">
            <input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchProducts();
              }}
              placeholder="搜索商品"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchProducts}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              搜索
            </button>
          </div>
          <button
            onClick={() => navigate('/products/create')}
            className="bg-blue-600 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium flex items-center space-x-2 whitespace-nowrap"
          >
            <Package className="h-5 w-5" />
            <span>发布商品</span>
          </button>
        </div>
      </div>

      {/* 分类筛选：L1 一级分类 */}
      <div className="mb-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => applyFilter('all')}
            className={`px-3 py-1 rounded-full border whitespace-nowrap text-sm ${
              activeCategory === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >全部</button>
          {l1Categories.map(c => (
            <button
              key={c.id}
              onClick={() => applyFilter(c.id)}
              className={`px-3 py-1 rounded-full border whitespace-nowrap text-sm ${
                activeCategory === c.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : selectedL1 === c.id
                    ? 'bg-blue-50 text-blue-600 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300'
              }`}
            >{c.name}</button>
          ))}
        </div>
      </div>

      {/* L2 二级分类（仅在选择了一级分类后展示） */}
      {selectedL1 && l2Categories.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <div className="flex items-center gap-2 pl-2 border-l-2 border-blue-200">
            <span className="text-xs text-gray-400 whitespace-nowrap">二级分类：</span>
            {l2Categories.map(c => (
              <button
                key={c.id}
                onClick={() => applyFilter(c.id)}
                className={`px-3 py-1 rounded-full border whitespace-nowrap text-xs ${
                  activeCategory === c.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >{c.name}</button>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无商品</h3>
          <p className="text-gray-600 mb-6">未找到匹配的商品</p>
          <button
            onClick={() => navigate('/products/create')}
            className="inline-flex items-center space-x-2 bg-blue-600 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl whitespace-nowrap"
          >
            <Package className="h-5 w-5" />
            <span>发布第一个商品</span>
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorited={favorites.has(product.id)}
                onFavorite={handleFavorite}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadMore}
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
            <div className="mt-8 text-center text-gray-500 text-sm">
              已经到底啦 ~
            </div>
          )}
        </>
      )}
    </div>
  );
}
