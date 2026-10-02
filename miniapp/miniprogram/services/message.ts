/**
 * 消息 API
 * 参照 frontend-v2/src/services/message.ts
 */
import { http } from '../utils/http';
import type { MessageDTO, ConversationDTO, SendMessageRequest } from '../types/api';

export const messageAPI = {
  async getConversations(): Promise<ConversationDTO[]> {
    const res = await http.get<ConversationDTO[]>('/messages/conversations');
    return res || [];
  },

  async getMessages(otherUserId: number, productId: number, page = 1, size = 50): Promise<MessageDTO[]> {
    const res = await http.get<MessageDTO[]>(`/messages/conversations/${productId}?otherUserId=${otherUserId}&page=${page}&size=${size}`);
    return res || [];
  },

  async sendMessage(data: SendMessageRequest): Promise<MessageDTO> {
    return http.post<MessageDTO>('/messages', data);
  },

  async markConversationRead(productId: number, otherUserId: number): Promise<void> {
    await http.put(`/messages/conversations/read?productId=${productId}&otherUserId=${otherUserId}`);
  },

  async getUnreadCount(): Promise<number> {
    const res = await http.get<{ count: number }>('/messages/unread-count');
    return res?.count || 0;
  },
};
