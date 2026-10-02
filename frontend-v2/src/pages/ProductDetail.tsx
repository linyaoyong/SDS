import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productAPI } from '../services/product';
import { orderAPI } from '../services/order';
import { type Review } from '../services/review';
import ReviewList from '../components/ReviewList';
import { resolveUrl } from '../utils/api';
import { buildFaceToFaceOrderRequest } from '../utils/face-to-face-order';
import type { ProductDTO } from '../types/api';
import { CONDITION_MAP } from '../types/api';
import {
  Package,
  Heart,
  Eye,
  Clock,
  User,
  MessageCircle,
  ShoppingCart,
  Share2,
  AlertCircle,
  Star,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/auth';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuthStore();
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  /** 从原始数据中提取标签列表（后端可能返回 JSON 字符串或数组） */
  const getTagList = (prod: any): string[] => {
    if (Array.isArray(prod.tagList)) return prod.tagList;
    if (Array.isArray(prod.tags)) return prod.tags;
    if (typeof prod.tags === 'string') {
      try { const parsed = JSON.parse(prod.tags); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  };
  /** 后端 ProductResponse 使用 stockQuantity，兼容两种字段名 */
  const getStock = (prod: any): number => prod.stockQuantity ?? prod.stock ?? 0;

  useEffect(() => {
    if (id) {
      fetchProductDetail();
      fetchReviews();
    }
  }, [id]);

  const fetchProductDetail = async () => {
    try {
      setLoading(true);
      if (id) {
        const data = await productAPI.getProduct(parseInt(id));
        setProduct(data);
        setIsFavorited(data.isFavorited ?? false);
      }
    } catch (error) {
      toast.error('获取商品详情失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      if (id) {
        setReviewsLoading(true);
        const res = await productAPI.getProductReviews(parseInt(id), 1, 10);
        setReviews(res.data);
      }
    } catch (error) {
      console.error('获取评价失败:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleFavorite = async () => {
    try {
      if (!id) return;
      if (isFavorited) {
        await productAPI.removeFavorite(parseInt(id));
        setIsFavorited(false);
        toast.success('已取消收藏');
      } else {
        await productAPI.addFavorite(parseInt(id));
        setIsFavorited(true);
        toast.success('已添加收藏');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleContactSeller = () => {
    if (!product) return;
    if (user && product.sellerId === user.id) {
      toast.info('这是您发布的商品，无法与自己聊天');
      return;
    }
    navigate(`/messages?userId=${product.sellerId}&productId=${product.id}`);
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (user && product.sellerId === user.id) {
      toast.info('不能购买自己发布的商品');
      return;
    }
    const stock = getStock(product);
    if (product.status !== 1 || stock <= 0) {
      toast.info('该商品已售完或暂不可购买');
      return;
    }
    if (!quantity || quantity < 1) {
      toast.error('请选择有效的购买数量');
      return;
    }
    const request = buildFaceToFaceOrderRequest(product.id, quantity, user);
    if (!request.ok) {
      toast.error(
        request.reason === 'phone'
          ? '请先在个人资料中补全手机号'
          : '请先在个人资料中补全姓名或用户名',
      );
      return;
    }
    try {
      await orderAPI.createOrder(request.data);
      toast.success('下单成功');
      navigate('/orders');
    } catch (error: any) {
      toast.error(error?.message || '下单失败');
    }
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.title,
          text: product.description,
          url: window.location.href,
        });
      } catch (error) {
        console.error('分享失败:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('链接已复制到剪贴板');
    }
  };

  const getConditionColor = (condition: number) => {
    if (condition >= 9) return 'text-green-600 bg-green-100';
    if (condition >= 7) return 'text-blue-600 bg-blue-100';
    if (condition >= 5) return 'text-yellow-600 bg-yellow-100';
    if (condition >= 3) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">商品不存在</h2>
          <p className="text-gray-600 mb-4">该商品可能已被删除或下架</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            返回商品列表
          </button>
        </div>
      </div>
    );
  }

  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-36 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：商品图片 */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-md">
              {product.images && product.images.length > 0 ? (
                <img
                  src={resolveUrl(product.images[currentImageIndex])}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Package className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>

            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === index
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={resolveUrl(image)}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：商品信息 */}
          <div className="space-y-6">
            {/* 1. 商品标题 */}
            <div>
              <div className="flex items-start justify-between">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight flex-1 min-w-0 break-words pr-4">
                  {product.title}
                </h1>
                <button
                  onClick={handleFavorite}
                  className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                    isFavorited
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
                  }`}
                >
                  <Heart className={`h-6 w-6 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* 2. 价格信息 */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold text-red-600">¥{product.price}</span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-500 line-through">¥{product.originalPrice}</span>
                )}
                {discount > 0 && (
                  <span className="bg-red-100 text-red-800 text-sm px-2 py-1 rounded-full">
                    {discount}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* 3. 分类路径（位于价格与成色之间） */}
            {product.parentCategoryName && (
              <div className="flex items-center text-sm text-gray-500">
                <span>{product.parentCategoryName}</span>
                <ChevronRight className="h-3 w-3 mx-1" />
                <span>{product.categoryName}</span>
              </div>
            )}

            {/* 4. 商品状态标签 */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(product.condition)}`}>
                {CONDITION_MAP[product.condition] || String(product.condition)}
              </span>
              {discount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  省 {discount}%
                </span>
              )}
              {getStock(product) <= 5 && getStock(product) > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  仅剩 {getStock(product)} 件
                </span>
              )}
              {getStock(product) === 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  已售罄
                </span>
              )}
            </div>

            {/* 5. 标签列表 */}
            {getTagList(product).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {getTagList(product).map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 6. 商品统计 */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center text-gray-600 mb-1">
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="text-sm">浏览</span>
                  </div>
                  <div className="text-lg font-semibold">{product.viewCount}</div>
                </div>
                <div>
                  <div className="flex items-center justify-center text-gray-600 mb-1">
                    <Heart className="h-4 w-4 mr-1" />
                    <span className="text-sm">收藏</span>
                  </div>
                  <div className="text-lg font-semibold">{product.favoriteCount}</div>
                </div>
                <div>
                  <div className="flex items-center justify-center text-gray-600 mb-1">
                    <Package className="h-4 w-4 mr-1" />
                    <span className="text-sm">库存</span>
                  </div>
                  <div className="text-lg font-semibold">{getStock(product)}</div>
                </div>
              </div>
            </div>

            {/* 7. 卖家信息 */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">卖家信息</h3>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0">
                  {product.sellerAvatar ? (
                    <img
                      src={resolveUrl(product.sellerAvatar)}
                      alt={product.sellerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{product.sellerName}</p>
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span>信用良好</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>发布时间: {new Date(product.createdAt).toLocaleDateString()}</span>
                </div>
                {product.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>面交地点: {product.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 8. 操作按钮 (桌面端) */}
            <div className="hidden md:block space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleContactSeller}
                  disabled={!!user && product.sellerId === user.id}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  联系卖家
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.status !== 1 || getStock(product) === 0 || (!!user && product.sellerId === user.id)}
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  立即购买
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">选择数量</span>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-1 text-gray-700 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={getStock(product)}
                    value={quantity}
                    onChange={(e) => {
                      if (e.target.value === '') { setQuantity(1); return; }
                      const v = parseInt(e.target.value, 10);
                      setQuantity(Number.isFinite(v) ? Math.max(1, Math.min(getStock(product), v)) : 1);
                    }}
                    className="w-20 text-center border-l border-r border-gray-300 py-1"
                    inputMode="numeric"
                  />
                  <button
                    onClick={() => setQuantity((q) => Math.min(getStock(product), q + 1))}
                    className="px-3 py-1 text-gray-700 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 className="h-4 w-4 mr-2" />
                分享商品
              </button>
            </div>
          </div>
        </div>

        {/* 商品描述 - 位于所有信息下方，可滚动 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">商品描述</h2>
          <div className="prose max-w-none text-gray-700 max-h-64 overflow-y-auto">
            <p className="whitespace-pre-wrap break-words">{product.description}</p>
          </div>
        </div>

        {/* 商品标签（完整展示） */}
        {getTagList(product).length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">商品标签</h2>
            <div className="flex flex-wrap gap-2">
              {getTagList(product).map((tag: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 商品评价 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">商品评价</h2>
          {reviewsLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : (
            <ReviewList reviews={reviews} />
          )}
        </div>

        {/* 温馨提示 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">交易提示</p>
              <ul className="space-y-1 text-blue-700">
                <li>• 建议当面交易，避免邮寄风险</li>
                <li>• 仔细检查商品质量后再付款</li>
                <li>• 保留交易凭证，维护自身权益</li>
                <li>• 如遇问题，及时联系平台客服</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 固定底部操作栏 (移动端) — 避开底栏，加上 safe-area-inset-bottom */}
      <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 bg-white border-t border-gray-200 px-3 py-2 md:hidden z-40 shadow-lg">
        {/* 数量选择行 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">选择数量</span>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-1 text-gray-700 hover:bg-gray-100 text-sm"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={getStock(product)}
              value={quantity}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (e.target.value === '') { setQuantity(1); return; }
                setQuantity(Number.isFinite(v) ? Math.max(1, Math.min(getStock(product), v)) : 1);
              }}
              className="w-12 text-center border-l border-r border-gray-300 py-1 text-sm"
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <button
              onClick={() => setQuantity((q) => Math.min(getStock(product), q + 1))}
              className="px-3 py-1 text-gray-700 hover:bg-gray-100 text-sm"
            >
              +
            </button>
          </div>
          <button
            onClick={handleShare}
            className="p-2 text-gray-500 hover:text-blue-600"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        {/* 操作按钮行 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFavorite}
            className={`p-2.5 rounded-lg transition-colors flex-shrink-0 ${
              isFavorited ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleContactSeller}
            disabled={!!user && product.sellerId === user.id}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors hover:bg-blue-700"
          >
            联系卖家
          </button>
          <button
            onClick={handleBuyNow}
            disabled={product.status !== 1 || getStock(product) === 0 || (!!user && product.sellerId === user.id)}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors hover:bg-red-700"
          >
            立即购买
          </button>
        </div>
      </div>
    </div>
  );
}
