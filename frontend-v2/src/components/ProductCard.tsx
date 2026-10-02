import { Link } from 'react-router-dom';
import type { ProductDTO } from '../types/api';
import { CONDITION_MAP } from '../types/api';
import { Heart, Eye, Package } from 'lucide-react';
import { Badge } from './ui/Badge';
import { resolveUrl } from '../utils/api';

type Props = {
  product: ProductDTO;
  isFavorited?: boolean;
  onFavorite?: (id: number) => void;
  onView?: (id: number) => void;
};

const conditionColor = (cond: number) => {
  if (cond >= 9) return 'green';
  if (cond >= 7) return 'blue';
  if (cond >= 5) return 'yellow';
  if (cond >= 3) return 'orange';
  return 'red';
};

export function ProductCard({ product, isFavorited, onFavorite, onView }: Props) {
  const image = product.images?.[0];
  const src = resolveUrl(image);
  const favorites = product.favoriteCount ?? (product as any).likeCount ?? 0;
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const stock = (product as any).stockQuantity ?? product.stock ?? 0;
  const avatarSrc = product.sellerAvatar ? resolveUrl(product.sellerAvatar) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100">
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {src ? (
          <img
            src={src}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onClick={() => onView?.(product.id)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <Package className="h-16 w-16 text-gray-400" />
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onFavorite?.(product.id); }}
          className={`absolute top-3 right-3 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ${
            isFavorited ? 'bg-red-500 text-white shadow-red-200' : 'bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-500'
          }`}
        >
          <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
            省 {discount}%
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors" title={product.title}>
          <Link to={`/products/${product.id}`} onClick={() => onView?.(product.id)}>
            {product.title}
          </Link>
        </h3>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed" title={product.description}>
          {product.description}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-red-600">¥{product.price}</span>
            {product.originalPrice && (
              <span className="text-sm text-gray-500 line-through">¥{product.originalPrice}</span>
            )}
          </div>
          <Badge color={conditionColor(product.condition)}>{CONDITION_MAP[product.condition] || String(product.condition)}</Badge>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              {product.viewCount}
            </span>
            <span className="flex items-center">
              <Heart className="h-4 w-4 mr-1" />
              {favorites}
            </span>
          </div>
          <span>库存: {stock}</span>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-gray-200">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-500 w-full h-full flex items-center justify-center">
                    {product.sellerName?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-gray-700 truncate max-w-[80px]" title={product.sellerName}>{product.sellerName}</span>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(product.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
