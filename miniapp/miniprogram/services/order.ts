/**
 * 订单 API
 * 参照 frontend-v2/src/services/order.ts
 */
import { http } from '../utils/http';
import type { OrderDTO } from '../types/api';

export interface CreateOrderData {
  productId: number;
  quantity: number;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
}

export const orderAPI = {
  async getBuyerOrders(params: {
    status?: number;
    page?: number;
    size?: number;
  } = {}): Promise<{ data: OrderDTO[]; total: number; page: number; size: number }> {
    return http.getPage<OrderDTO>('/orders', {
      role: 'buyer',
      status: params.status !== undefined ? params.status : undefined,
      page: params.page || 1,
      size: params.size || 20,
    });
  },

  async getSellerOrders(params: {
    status?: number;
    page?: number;
    size?: number;
  } = {}): Promise<{ data: OrderDTO[]; total: number; page: number; size: number }> {
    return http.getPage<OrderDTO>('/orders', {
      role: 'seller',
      status: params.status !== undefined ? params.status : undefined,
      page: params.page || 1,
      size: params.size || 20,
    });
  },

  async createOrder(data: CreateOrderData): Promise<OrderDTO> {
    return http.post<OrderDTO>('/orders', data);
  },

  async pay(id: number): Promise<void> {
    await http.put(`/orders/${id}/pay`);
  },

  async deliver(id: number): Promise<void> {
    await http.put(`/orders/${id}/deliver`);
  },

  async confirm(id: number): Promise<void> {
    await http.put(`/orders/${id}/complete`);
  },

  async cancel(id: number, reason?: string): Promise<void> {
    await http.put(`/orders/${id}/cancel`, { cancelReason: reason });
  },
};
