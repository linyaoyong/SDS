/**
 * WebSocket 聊天服务
 * 参照 frontend-v2/src/services/websocket.ts
 */
import { getToken } from '../utils/http';
import { authStore } from '../stores/auth-store';

const WS_URL = 'ws://localhost:8080/ws/chat';

type MessageHandler = (msg: any) => void;

class WebSocketService {
  private socketTask: WechatMiniprogram.SocketTask | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private lastPongTime = Date.now();
  private retryCount = 0;
  private maxRetries = 5;
  private intentionalClose = false;
  private _userId: number | null = null;

  onMessage: MessageHandler | null = null;

  /** 连接 WebSocket */
  connect(userId: number): void {
    // 已连接且用户相同则跳过
    if (this.socketTask && this._userId === userId) return;

    this.disconnect();
    this.intentionalClose = false;
    this._userId = userId;
    this.retryCount = 0;
    this.lastPongTime = Date.now();
    this._doConnect();
  }

  private _doConnect(): void {
    const token = getToken();
    if (!token) return;

    this.socketTask = wx.connectSocket({
      url: `${WS_URL}?token=${token}`,
      fail: (err) => console.error('WebSocket connect fail:', err),
    });

    this.socketTask.onOpen(() => {
      console.log('[WS] Connected');
      this.retryCount = 0;
      this.lastPongTime = Date.now();
      this._startHeartbeat();
    });

    this.socketTask.onMessage((res) => {
      try {
        const msg = JSON.parse(res.data as string);

        // 心跳响应
        if (msg.type === 'PONG') {
          this.lastPongTime = Date.now();
          return;
        }

        // Token 过期
        if (msg.type === 'TOKEN_EXPIRED') {
          console.warn('[WS] Token expired, closing...');
          this.socketTask?.close({});
          return;
        }

        // 业务消息
        if (msg.type === 'NEW_MESSAGE' || msg.type === 'SYSTEM_NOTICE') {
          if (this.onMessage) {
            this.onMessage(msg.data || msg);
          }
        }
      } catch (e) {
        console.warn('[WS] Parse error:', e);
      }
    });

    this.socketTask.onClose(() => {
      console.log('[WS] Disconnected');
      this._stopHeartbeat();

      if (!this.intentionalClose && this.retryCount < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 16000);
        this.retryCount++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.retryCount})`);
        this.reconnectTimer = setTimeout(() => this._doConnect(), delay) as unknown as number;
      }
    });

    this.socketTask.onError((err) => {
      console.error('[WS] Error:', err);
    });
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socketTask) {
        this.socketTask.send({
          data: JSON.stringify({ type: 'PING' }),
          fail: (err) => console.warn('[WS] Heartbeat send fail:', err),
        });
      }
      // 10s 未收到 PONG → 视为断开
      if (Date.now() - this.lastPongTime > 10000) {
        console.warn('[WS] Heartbeat timeout, closing...');
        this.socketTask?.close({});
      }
    }, 30000) as unknown as number;
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** 断开连接 */
  disconnect(): void {
    this.intentionalClose = true;
    this._stopHeartbeat();
    this.socketTask?.close({});
    this.socketTask = null;
    this._userId = null;
    this.retryCount = 0;
  }

  /** 发送消息（仅用于心跳，业务消息走 REST API） */
  send(data: object): void {
    if (this.socketTask) {
      this.socketTask.send({ data: JSON.stringify(data) });
    }
  }

  isConnected(): boolean {
    return this.socketTask !== null;
  }
}

export const wsService = new WebSocketService();
