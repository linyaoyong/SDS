import { apiClient } from '../utils/api';
import type { OrderDTO } from '../types/api';
import type { CreateOrderData } from '../utils/face-to-face-order';

export type { CreateOrderData } from '../utils/face-to-face-order';

export const orderAPI = {
  /** 创建订单 */
  async createOrder(data: CreateOrderData): Promise<OrderDTO> {
    return apiClient.post<OrderDTO>('/orders', data);
  },

  /** 模拟支付 */
  async pay(orderId: number): Promise<void> {
    await apiClient.put(`/orders/${orderId}/pay`);
  },

  /** 卖家发货 */
  async deliver(orderId: number): Promise<void> {
    await apiClient.put(`/orders/${orderId}/deliver`);
  },

  /** 买家确认收货 */
  async complete(orderId: number): Promise<void> {
    await apiClient.put(`/orders/${orderId}/complete`);
  },

  /** 取消订单 */
  async cancel(orderId: number, cancelReason: string = '用户取消'): Promise<void> {
    await apiClient.put(`/orders/${orderId}/cancel`, { cancelReason });
  },

  /** 获取订单列表 */
  async getOrders(params: {
    role?: 'buyer' | 'seller';
    status?: number;
    page?: number;
    size?: number;
  } = {}): Promise<{ data: OrderDTO[]; total: number; page: number; size: number }> {
    const sp = new URLSearchParams();
    sp.set('role', params.role || 'buyer');
    if (params.status !== undefined && params.status !== null) sp.set('status', String(params.status));
    sp.set('page', String(params.page || 1));
    sp.set('size', String(params.size || 20));
    const res = await apiClient.getPage<OrderDTO>(`/orders?${sp.toString()}`);
    return { data: res.data || [], total: res.total || 0, page: res.page || 1, size: res.size || 20 };
  },

  /** 买家订单 */
  async getBuyerOrders(page: number = 1, size: number = 20, status?: number): Promise<{ data: OrderDTO[]; total: number; page: number; size: number }> {
    return this.getOrders({ role: 'buyer', status, page, size });
  },

  /** 卖家订单 */
  async getSellerOrders(page: number = 1, size: number = 20, status?: number): Promise<{ data: OrderDTO[]; total: number; page: number; size: number }> {
    return this.getOrders({ role: 'seller', status, page, size });
  },

  /** 获取单个订单详情（通过列表查找） */
  async getOrder(orderId: number): Promise<OrderDTO | null> {
    // 尝试从买卖双方列表中找到
    const [buyer, seller] = await Promise.all([
      this.getBuyerOrders(1, 100),
      this.getSellerOrders(1, 100),
    ]);
    const all = [...buyer.data, ...seller.data];
    return all.find(o => o.id === orderId) || null;
  },

  /** 提交评价 */
  async submitReview(orderId: number, rating: number, content: string): Promise<any> {
    return apiClient.post<any>(`/orders/${orderId}/review`, { rating, content });
  },
};
