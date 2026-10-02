import { apiClient } from '../utils/api';
import { userAPI } from './user';
import type { ProductDTO, ProductCreateRequest, CategoryDTO, PageResponse } from '../types/api';

export const productAPI = {
  /** 商品列表（搜索+筛选+分页） */
  async getProducts(params: {
    keyword?: string;
    categoryId?: number;
    mine?: boolean;
    page?: number;
    size?: number;
    sortBy?: string;
  } = {}): Promise<PageResponse<ProductDTO>> {
    const sp = new URLSearchParams();
    if (params.keyword) sp.set('keyword', params.keyword);
    if (params.categoryId) sp.set('categoryId', String(params.categoryId));
    if (params.mine) sp.set('mine', 'true');
    sp.set('page', String(params.page || 1));
    sp.set('size', String(params.size || 20));
    if (params.sortBy) sp.set('sortBy', params.sortBy);
    const res = await apiClient.getPage<ProductDTO>(`/products?${sp.toString()}`);

    const data = res.data || [];
    if (data.length > 0) {
      const sellerIds = [...new Set(data.map(p => p.sellerId).filter(id => id))];
      if (sellerIds.length > 0) {
        try {
          const users = await userAPI.batchGetUsers(sellerIds);
          const userMap = Object.fromEntries(users.map(u => [u.id, u]));
          data.forEach(p => {
            if (p.sellerId && userMap[p.sellerId]) {
              p.sellerName = userMap[p.sellerId].name || userMap[p.sellerId].username || `用户 #${p.sellerId}`;
              p.sellerAvatar = userMap[p.sellerId].avatarUrl;
            }
          });
        } catch (e) {
          console.error('Failed to fetch seller info', e);
        }
      }
    }

    return { data, total: res.total || 0, page: res.page || 1, size: res.size || 20 };
  },

  /** 热门商品 */
  async getHotProducts(limit: number = 10): Promise<ProductDTO[]> {
    const res = await this.getProducts({ sortBy: 'viewCount', size: limit, page: 1 });
    return res.data || [];
  },

  /** 最新商品 */
  async getLatestProducts(limit: number = 10): Promise<ProductDTO[]> {
    const res = await this.getProducts({ sortBy: 'createdAt', size: limit, page: 1 });
    return res.data || [];
  },

  /** 商品详情 */
  async getProduct(id: number): Promise<ProductDTO> {
    const data = await apiClient.get<ProductDTO>(`/products/${id}`);
    if (data && data.sellerId && !data.sellerName) {
      try {
        const user = await userAPI.getUserById(data.sellerId);
        if (user) {
          data.sellerName = user.name || user.username || `用户 #${data.sellerId}`;
          data.sellerAvatar = user.avatarUrl;
        }
      } catch (e) {
        console.error('Failed to fetch seller info', e);
      }
    }
    return data;
  },

  /** 分类树 */
  async getAllCategories(): Promise<CategoryDTO[]> {
    const res = await apiClient.get<CategoryDTO[]>('/categories');
    return res || [];
  },

  /** 创建商品 */
  async createProduct(data: ProductCreateRequest): Promise<ProductDTO> {
    return apiClient.post<ProductDTO>('/products', data);
  },

  /** 更新商品（需先下架） */
  async updateProduct(id: number, data: Partial<ProductCreateRequest>): Promise<ProductDTO> {
    return apiClient.put<ProductDTO>(`/products/${id}`, data);
  },

  /** 下架 */
  async offShelf(id: number): Promise<void> {
    await apiClient.put(`/products/${id}/off-shelf`);
  },

  /** 重新上架 */
  async reList(id: number): Promise<void> {
    await apiClient.put(`/products/${id}/re-list`);
  },

  /** 删除 */
  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  // ---- 收藏 ----

  async getMyFavorites(page: number = 1, size: number = 20): Promise<PageResponse<ProductDTO>> {
    const res = await apiClient.getPage<ProductDTO>(`/favorites?page=${page}&size=${size}`);
    return { data: res.data || [], total: res.total || 0, page: res.page || page, size: res.size || size };
  },

  async addFavorite(productId: number): Promise<void> {
    await apiClient.post(`/favorites/${productId}`);
  },

  async removeFavorite(productId: number): Promise<void> {
    await apiClient.delete(`/favorites/${productId}`);
  },

  // ---- 点赞 ----

  async like(productId: number): Promise<void> {
    await apiClient.post(`/products/${productId}/like`);
  },

  async unlike(productId: number): Promise<void> {
    await apiClient.delete(`/products/${productId}/like`);
  },

  // ---- 图片 ----

  /** 上传单张图片到指定商品，返回图片 URL */
  async uploadProductImage(productId: number, file: File): Promise<string> {
    return apiClient.uploadFile<string>(`/products/upload/${productId}`, file, 'file');
  },

  /** 追加图片 URL */
  async addProductImage(productId: number, imageUrl: string): Promise<void> {
    await apiClient.post(`/products/${productId}/images`, { imageUrl });
  },

  /** 删除图片 */
  async deleteProductImage(productId: number, index: number): Promise<void> {
    await apiClient.delete(`/products/${productId}/images/${index}`);
  },

  /** 调整图片顺序 */
  async sortProductImages(productId: number, images: string[]): Promise<void> {
    await apiClient.put(`/products/${productId}/images/sort`, { images });
  },

  // ---- 评价 ----

  async getProductReviews(productId: number, page: number = 1, size: number = 20): Promise<PageResponse<any>> {
    const res = await apiClient.getPage<any>(`/products/${productId}/reviews?page=${page}&size=${size}`);
    return { data: res.data || [], total: res.total || 0, page: res.page || page, size: res.size || size };
  },
};
