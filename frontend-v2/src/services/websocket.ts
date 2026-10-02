import { getToken } from '../utils/api';
import { useWebSocketStore } from '../stores/auth';

const WS_URL = `ws://${window.location.hostname}:8080/ws/chat`;

class WebSocketService {
  private ws: WebSocket | null = null;
  private userId: number | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastPongTime: number = Date.now();
  private retryCount: number = 0;
  private maxRetries: number = 5;
  private intentionalClose: boolean = false;

  /** 收到消息时的回调（供外部注册） */
  onMessage: ((msg: any) => void) | null = null;

  connect(userId: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.userId === userId) {
      return;
    }

    this.disconnect();
    this.intentionalClose = false;
    this.userId = userId;
    this.retryCount = 0;
    this.lastPongTime = Date.now();

    this.doConnect();
  }

  private doConnect() {
    const token = getToken();
    if (!token) return;

    try {
      this.ws = new WebSocket(`${WS_URL}?token=${token}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        useWebSocketStore.getState().connect();
        this.retryCount = 0;
        this.lastPongTime = Date.now();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'PONG') {
            this.lastPongTime = Date.now();
            return;
          }

          if (msg.type === 'TOKEN_EXPIRED') {
            console.warn('WebSocket token expired');
            this.ws?.close();
            return;
          }

          // 业务消息: NEW_MESSAGE | SYSTEM_NOTICE
          if (msg.type === 'NEW_MESSAGE' || msg.type === 'SYSTEM_NOTICE') {
            const payload = msg.data;
            useWebSocketStore.getState().addMessage(payload);
            useWebSocketStore.getState().refreshUnreadCount();
            // 触发外部回调
            if (this.onMessage) {
              this.onMessage(payload);
            }
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        useWebSocketStore.getState().disconnect();
        this.stopHeartbeat();

        if (!this.intentionalClose && this.retryCount < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, this.retryCount), 16000);
          this.retryCount++;
          console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.retryCount})`);
          this.reconnectTimer = setTimeout(() => this.doConnect(), delay);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
      // 10s 未收到 PONG → 认为断开
      if (Date.now() - this.lastPongTime > 10000) {
        console.warn('WebSocket heartbeat timeout');
        this.ws?.close();
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    this.intentionalClose = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.userId = null;
    this.retryCount = 0;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const webSocketService = new WebSocketService();
