/**
 * 商品 API
 * 参照 frontend-v2/src/services/product.ts
 */
import { http } from '../utils/http';
import { userAPI } from './auth';
import type { ProductDTO, ProductCreateRequest, CategoryDTO } from '../types/api';
import { enrichProductSellers } from '../utils/product-sellers';

async function enrichSellers(products: ProductDTO[]): Promise<void> {
  await enrichProductSellers(products, userAPI.batchGetUsers, userAPI.getUserById);
}

export const productAPI = {
  async getProducts(params: {
    keyword?: string;
    categoryId?: number;
    mine?: boolean;
    page?: number;
    size?: number;
    sortBy?: string;
  } = {}): Promise<{ data: ProductDTO[]; total: number; page: number; size: number }> {
    const res = await http.getPage<ProductDTO>('/products', {
      keyword: params.keyword || undefined,
      categoryId: params.categoryId || undefined,
      mine: params.mine || undefined,
      page: params.page || 1,
      size: params.size || 20,
      sortBy: params.sortBy || undefined,
    });
    await enrichSellers(res.data);
    return res;
  },

  async getHotProducts(limit = 10): Promise<ProductDTO[]> {
    const res = await this.getProducts({ sortBy: 'viewCount', size: limit, page: 1 });
    return res.data || [];
  },

  async getLatestProducts(limit = 10): Promise<ProductDTO[]> {
    const res = await this.getProducts({ sortBy: 'createdAt', size: limit, page: 1 });
    return res.data || [];
  },

  async getProduct(id: number): Promise<ProductDTO> {
    const data = await http.get<ProductDTO>(`/products/${id}`);
    if (data && data.sellerId && !data.sellerName) {
      try {
        const u = await userAPI.getUserById(data.sellerId);
        if (u) {
          data.sellerName = u.name || u.username || '用户';
          data.sellerAvatar = u.avatarUrl;
        }
      } catch { /* ignore */ }
    }
    return data;
  },

  async getAllCategories(): Promise<CategoryDTO[]> {
    const res = await http.get<CategoryDTO[]>('/categories');
    return res || [];
  },

  async createProduct(data: ProductCreateRequest): Promise<ProductDTO> {
    return http.post<ProductDTO>('/products', data);
  },

  async updateProduct(id: number, data: Partial<ProductCreateRequest>): Promise<ProductDTO> {
    return http.put<ProductDTO>(`/products/${id}`, data);
  },

  async offShelf(id: number): Promise<void> {
    await http.put(`/products/${id}/off-shelf`);
  },

  async reList(id: number): Promise<void> {
    await http.put(`/products/${id}/re-list`);
  },

  async deleteProduct(id: number): Promise<void> {
    await http.delete(`/products/${id}`);
  },

  // ---- 收藏 ----

  async getFavorites(page = 1, size = 20): Promise<{ data: ProductDTO[]; total: number; page: number; size: number }> {
    const res = await http.getPage<ProductDTO>('/favorites', { page, size });
    await enrichSellers(res.data);
    return res;
  },

  async addFavorite(productId: number): Promise<void> {
    await http.post(`/favorites/${productId}`);
  },

  async removeFavorite(productId: number): Promise<void> {
    await http.delete(`/favorites/${productId}`);
  },

  // ---- 图片 ----

  async uploadProductImage(productId: number, filePath: string): Promise<string> {
    return http.uploadFile<string>(`/products/upload/${productId}`, filePath);
  },

  async addProductImage(productId: number, imageUrl: string): Promise<void> {
    await http.post(`/products/${productId}/images`, { imageUrl });
  },

  async deleteProductImage(productId: number, index: number): Promise<void> {
    await http.delete(`/products/${productId}/images/${index}`);
  },

  // ---- 评价 ----

  async getProductReviews(productId: number, page = 1, size = 20): Promise<{ data: any[]; total: number; page: number; size: number }> {
    return http.getPage<any>(`/products/${productId}/reviews`, { page, size });
  },
};
