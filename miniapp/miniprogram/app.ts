/**
 * 小程序入口
 */
import { authStore } from './stores/auth-store';
import { wsService } from './services/websocket';

App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化 authStore（构造函数中已从 Storage 恢复）
    // 如果已登录，连接 WebSocket
    if (authStore.isAuthenticated && authStore.user) {
      wsService.connect(authStore.user.id);

      // 监听全局 WebSocket 消息（toast 通知）
      wsService.onMessage = (msg) => {
        if (msg.messageType === 'SYSTEM') {
          wx.showToast({
            title: msg.content || '系统通知',
            icon: 'none',
            duration: 3000,
          });
        } else {
          wx.showToast({
            title: `${msg.senderName || '用户'}: ${(msg.content || '').slice(0, 20)}`,
            icon: 'none',
            duration: 2000,
          });
        }
      };
    }
  },

  onShow() {
    // 从后台切回前台时检查 WebSocket 连接
    if (authStore.isAuthenticated && authStore.user) {
      if (!wsService.isConnected()) {
        wsService.connect(authStore.user.id);
      }
    }
  },
});
