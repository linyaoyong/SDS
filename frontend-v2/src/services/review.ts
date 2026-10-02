import { apiClient } from '../utils/api';
import type { ReviewDTO } from '../types/api';

export interface Review extends ReviewDTO {}

export const reviewAPI = {
  /** 提交评价 (买家评价卖家) */
  async createReview(orderId: number, rating: number, content: string): Promise<Review> {
    return apiClient.post<Review>(`/orders/${orderId}/review`, { rating, content });
  },

  /** 获取商品评价列表 */
  async getProductReviews(productId: number, page: number = 1, size: number = 20): Promise<{
    data: Review[];
    total: number;
    page: number;
    size: number;
  }> {
    const res = await apiClient.getPage<Review>(
      `/products/${productId}/reviews?page=${page}&size=${size}`
    );
    return { data: res.data || [], total: res.total || 0, page: res.page || 1, size: res.size || 20 };
  },

  async getOrderReviewHistory(orderId: number): Promise<Review[]> {
    return apiClient.get<Review[]>(`/orders/${orderId}/reviews/history`);
  },
};
