/**
 * 评价 API
 * 参照 frontend-v2/src/services/review.ts
 */
import { http } from '../utils/http';
import type { ReviewDTO } from '../types/api';

export const reviewAPI = {
  async create(orderId: number, data: {
    rating: number;
    content: string;
  }): Promise<ReviewDTO> {
    return http.post<ReviewDTO>(`/orders/${orderId}/review`, data);
  },

  async getByProduct(productId: number, page = 1, size = 20): Promise<{ data: ReviewDTO[]; total: number; page: number; size: number }> {
    return http.getPage<ReviewDTO>(`/products/${productId}/reviews`, { page, size });
  },

  async getOrderReviewHistory(orderId: number): Promise<ReviewDTO[]> {
    return http.get<ReviewDTO[]>(`/orders/${orderId}/reviews/history`);
  },
};
