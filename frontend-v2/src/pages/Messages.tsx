import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { messageAPI } from '../services/message';
import { userAPI } from '../services/user';
import { productAPI } from '../services/product';
import type { ConversationDTO, MessageDTO } from '../types/api';
import { resolveUrl } from '../utils/api';
import { MessageSquare, User, ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/auth';

const STATUS_ICONS: Record<number, string> = {
  0: '✓',    // sent (✓)
  1: '✓✓',  // read (✓✓)
};

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const targetUserId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : null;
  const productId = searchParams.get('productId') ? parseInt(searchParams.get('productId')!) : null;
  const isChatMode = !!targetUserId && !!productId;

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await messageAPI.getConversations();
      setConversations(data || []);
    } catch {
      toast.error('获取会话列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch conversation messages
  const fetchMessages = useCallback(async () => {
    if (!targetUserId || !productId) return;
    try {
      setLoading(true);
      const data = await messageAPI.getConversation(productId, targetUserId, 1, 50);
      const sorted = [...(data || [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(sorted);
    } catch {
      toast.error('获取消息失败');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, productId]);

  // Mark conversation as read
  const markRead = useCallback(async () => {
    if (!targetUserId || !productId) return;
    try {
      await messageAPI.markConversationRead(productId, targetUserId);
      // 标记已读后刷新会话列表以更新未读数
      fetchConversations();
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  }, [targetUserId, productId, fetchConversations]);

  useEffect(() => {
    if (isChatMode) {
      fetchMessages();
      markRead();
    } else {
      fetchConversations();
    }
  }, [isChatMode, targetUserId, productId, fetchMessages, fetchConversations, markRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async () => {
    if (!newMessage.trim() || !targetUserId || !productId) return;
    const content = newMessage.trim();
    // 乐观更新：先添加到本地列表
    const optimisticId = -Date.now();
    const optimistic: MessageDTO = {
      id: optimisticId,
      senderId: user?.id || 0,
      senderName: user?.name || '',
      receiverId: targetUserId,
      receiverName: '',
      relatedId: productId,
      relatedType: 'PRODUCT',
      messageType: 'TEXT',
      content,
      images: '',
      isRead: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    try {
      const created = await messageAPI.sendMessage({
        receiverId: targetUserId,
        content,
        productId: productId,
      });
      // 替换乐观消息为服务器返回的真实消息
      setMessages(prev => prev.map(m => m.id === optimisticId ? created : m));
    } catch (err: any) {
      // 移除失败的消息
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast.error(err?.message || '发送失败，请检查网络后重试');
    }
  }, [newMessage, targetUserId, productId, user]);

  const [fallbackUser, setFallbackUser] = useState<{name: string} | null>(null);
  const [fallbackProduct, setFallbackProduct] = useState<{title: string} | null>(null);

  // Find active conversation details from loaded list
  const activeConv = conversations.find(
    c => c.otherUser.id === targetUserId && c.product.id === productId
  );

  // Fallback: try to find conversation by userId alone (productId might differ)
  const fallbackConv = !activeConv
    ? conversations.find(c => c.otherUser.id === targetUserId)
    : null;

  // Fallback: try to find conversation by productId alone
  const productConv = !activeConv && !fallbackConv
    ? conversations.find(c => c.product.id === productId)
    : null;

  useEffect(() => {
    if (isChatMode && !activeConv && !fallbackConv && targetUserId) {
      userAPI.getUserById(targetUserId).then(u => {
        if (u) setFallbackUser({ name: u.name || u.username || `用户 #${targetUserId}` });
      }).catch(() => {});
    }
    if (isChatMode && !activeConv && !productConv && productId) {
      productAPI.getProduct(productId).then(p => {
        if (p) setFallbackProduct({ title: p.title });
      }).catch(() => {});
    }
  }, [isChatMode, activeConv, fallbackConv, productConv, targetUserId, productId]);

  if (loading && isChatMode) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // ============ CHAT MODE ============
  if (isChatMode) {
    const bestMatch = activeConv || fallbackConv || productConv;
    const otherName = bestMatch?.otherUser.name || fallbackUser?.name || (targetUserId ? `用户 #${targetUserId}` : '未知用户');
    const productTitle = bestMatch?.product.title || fallbackProduct?.title || (productId ? `商品 #${productId}` : '未知商品');

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/messages')}
            className="flex items-center text-sm text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回消息中心
          </button>
          <h1 className="text-xl font-bold text-gray-900 truncate">{otherName}</h1>
          <div className="w-20" />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          {/* Related product info */}
          <div
            className="mb-4 p-3 border rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => navigate(`/products/${productId}`)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 truncate">{productTitle}</div>
              </div>
              <span className="text-blue-600 text-sm ml-2 whitespace-nowrap">查看商品</span>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="space-y-4 max-h-[60vh] overflow-y-auto px-1"
          >
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">还没有消息，开始聊天吧</p>
              </div>
            ) : (
              messages
                .filter(msg => msg.messageType !== 'SYSTEM' || msg.receiverId === (user?.id ?? 0))
                .map((msg) => {
                // System message
                if (msg.messageType === 'SYSTEM') {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="bg-yellow-50 text-yellow-700 text-xs px-3 py-1.5 rounded-full max-w-[80%] text-center">
                        <span className="font-medium">🔔 系统消息：</span>{msg.content}
                      </div>
                    </div>
                  );
                }

                // Normal message
                const own = user ? msg.senderId === user.id : false;
                return (
                  <div key={msg.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                        own
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${
                        own ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        <span className="text-[10px]">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {own && (
                          <span className="text-[10px]">
                            {msg.isRead ? STATUS_ICONS[1] : STATUS_ICONS[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="mt-4 flex items-center space-x-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isComposing && newMessage.trim()) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="输入消息"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={send}
              disabled={!newMessage.trim()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4 mr-2" />
              发送
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ CONVERSATION LIST ============
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">消息中心</h1>
        {totalUnread > 0 && (
          <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full">
            未读 {totalUnread}
          </span>
        )}
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">暂无消息</p>
          <p className="text-gray-500 mt-2">与其他用户互动来开始对话吧！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv) => {
            const isUnread = (conv.unreadCount || 0) > 0;
            return (
              <div
                key={`${conv.otherUser.id}-${conv.product.id}`}
                onClick={() => navigate(`/messages?userId=${conv.otherUser.id}&productId=${conv.product.id}`)}
                className={`bg-white rounded-lg shadow-md p-5 ${isUnread ? 'border-l-4 border-blue-500' : ''} cursor-pointer hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      {conv.otherUser.avatar ? (
                        <img
                          src={resolveUrl(conv.otherUser.avatar)}
                          alt={conv.otherUser.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-gray-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{conv.otherUser.name}</span>
                        {isUnread && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            未读 {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      关于: {conv.product.title}
                    </div>
                    <div className="text-sm text-gray-800 truncate">
                      {conv.lastMessage?.content || ''}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
