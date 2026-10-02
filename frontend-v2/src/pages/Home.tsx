import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { productAPI } from '../services/product';
import { resolveUrl } from '../utils/api';
import type { ProductDTO } from '../types/api';
import { ShoppingBag, Package, MessageSquare, Heart, User, TrendingUp, Clock, Eye } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [hotProducts, setHotProducts] = useState<ProductDTO[]>([]);
  const [latestProducts, setLatestProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [hot, latest] = await Promise.all([
        productAPI.getHotProducts(6),
        productAPI.getLatestProducts(6),
      ]);
      setHotProducts(hot);
      setLatestProducts(latest);
    } catch (error) {
      console.error('加载商品失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const ProductCard = ({ product }: { product: ProductDTO }) => (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group overflow-hidden" onClick={() => navigate(`/products/${product.id}`)}>
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {product.images?.[0] ? (
          <img src={resolveUrl(product.images[0])} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-10 w-10 text-gray-400" /></div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-0.5 flex items-center gap-1 text-xs text-gray-600"><Eye className="h-3 w-3" />{product.viewCount}</div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">{product.title}</h3>
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-red-600">¥{product.price}</span>
          {product.originalPrice && <span className="text-xs text-gray-400 line-through">¥{product.originalPrice}</span>}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1"><span>{product.sellerName}</span><span>❤️ {product.favoriteCount}</span></div>
      </div>
    </div>
  );

  const actions = [
    { icon: ShoppingBag, title: '浏览商品', color: 'bg-blue-500', path: '/products' },
    { icon: Package, title: '发布商品', color: 'bg-green-500', path: '/publish' },
    { icon: MessageSquare, title: '消息', color: 'bg-orange-500', path: '/messages' },
    { icon: Heart, title: '收藏', color: 'bg-red-500', path: '/favorites' },
    { icon: User, title: '个人中心', color: 'bg-purple-500', path: '/profile' },
  ];

  return (
    <div>
      {isAuthenticated && user && (
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            欢迎来到校园二手<br className="sm:hidden" />
            {/*<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">校园二手</span>*/}
          </h1>

          <p className="text-gray-600">你好，{user.name}！</p>
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-10">
        {actions.map(a => (
          <div key={a.path} onClick={() => navigate(a.path)} className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md cursor-pointer text-center transition-all">
            <div className={`w-9 h-9 ${a.color} rounded-lg flex items-center justify-center mx-auto mb-1.5`}><a.icon className="h-4 w-4 text-white" /></div>
            <span className="text-xs text-gray-600">{a.title}</span>
          </div>
        ))}
      </div>

      {[
        { title: '热门商品', icon: TrendingUp, color: 'bg-red-500', products: hotProducts },
        { title: '最新发布', icon: Clock, color: 'bg-blue-500', products: latestProducts },
      ].map(section => (
        <div key={section.title} className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><div className={`w-7 h-7 ${section.color} rounded-lg flex items-center justify-center`}><section.icon className="h-4 w-4 text-white" /></div><h2 className="text-lg font-bold">{section.title}</h2></div>
            <button onClick={() => navigate('/products')} className="text-blue-600 text-sm">查看更多 →</button>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl p-2 animate-pulse"><div className="aspect-square bg-gray-200 rounded-lg mb-2" /><div className="h-3 bg-gray-200 rounded mb-1" /><div className="h-4 bg-gray-200 rounded w-1/2" /></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {section.products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
