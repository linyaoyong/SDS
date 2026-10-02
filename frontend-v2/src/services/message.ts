import { apiClient } from '../utils/api';
import type { MessageDTO, SendMessageRequest, ConversationDTO } from '../types/api';

export const messageAPI = {
  /** 发送消息 */
  async sendMessage(data: SendMessageRequest): Promise<MessageDTO> {
    return apiClient.post<MessageDTO>('/messages', data);
  },

  /** 获取会话列表 */
  async getConversations(): Promise<ConversationDTO[]> {
    const res = await apiClient.get<ConversationDTO[]>('/messages/conversations');
    return res || [];
  },

  /** 获取与某人的聊天记录（分页） */
  async getConversation(productId: number, otherUserId: number, page: number = 1, size: number = 50): Promise<MessageDTO[]> {
    const res = await apiClient.getPage<MessageDTO>(
      `/messages/conversations/${productId}?otherUserId=${otherUserId}&page=${page}&size=${size}`
    );
    return res.data || [];
  },

  /** 获取总未读数 */
  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<number>('/messages/unread-count');
    return res ?? 0;
  },

  /** 标记某会话已读，返回剩余未读数 */
  async markConversationRead(productId: number, otherUserId: number): Promise<number> {
    const res = await apiClient.put<number>(
      `/messages/conversations/read?productId=${productId}&otherUserId=${otherUserId}`
    );
    return res ?? 0;
  },
};
