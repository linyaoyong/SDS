import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductCreate from './pages/ProductCreate';
import ProductEdit from './pages/ProductEdit';
import ProductDetail from './pages/ProductDetail';
import Messages from './pages/Messages';
import Favorites from './pages/Favorites';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import MyProducts from './pages/MyProducts';
import { useAuthStore } from './stores/auth';
import { useEffect, useRef } from 'react';
import { authAPI } from './services/auth';
import { webSocketService } from './services/websocket';

function App() {
  const { isAuthenticated, user, token } = useAuthStore();
  const initRef = useRef(false);

  // 启动时恢复用户信息
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const t = token;
    if (t && !user) {
      authAPI.getCurrentUser()
        .then((u) => {
          const rt = localStorage.getItem('refreshToken') || '';
          useAuthStore.getState().login(t, rt, u);
        })
        .catch(() => {
          // token 可能过期，尝试刷新
          useAuthStore.getState().refreshAuth().then((ok) => {
            if (ok) {
              authAPI.getCurrentUser().then((u) => {
                const newToken = localStorage.getItem('token') || '';
                const newRt = localStorage.getItem('refreshToken') || '';
                useAuthStore.getState().login(newToken, newRt, u);
              }).catch(() => {});
            }
          }).catch(() => {});
        });
    }
  }, []);

  // 全局 WebSocket 通知（限制频率防止重复弹窗）
  useEffect(() => {
    let lastToastTime = 0;
    if (user) {
      webSocketService.onMessage = (payload: any) => {
        const now = Date.now();
        // 同一秒内只显示一条 toast
        if (now - lastToastTime < 2000) return;
        lastToastTime = now;
        if (payload.messageType === 'SYSTEM') {
          toast.info('📢 系统通知', {
            description: payload.content,
            duration: 8000,
            closeButton: true,
          });
        } else {
          toast('💬 新消息', {
            description: `${payload.senderName || '用户'}: ${(payload.content || '').slice(0, 40)}`,
            duration: 8000,
            closeButton: true,
          });
        }
      };
    }
  }, [user]);

  // 登录后检查通知（仅执行一次）
  useEffect(() => {
    if (isAuthenticated && user) {
      const key = 'last_notify_check';
      const lastCheck = sessionStorage.getItem(key);
      // 同一会话不重复弹出初始通知
      if (lastCheck) return;
      sessionStorage.setItem(key, Date.now().toString());

      Promise.all([
        import('./services/message').then(m => m.messageAPI.getUnreadCount()),
        import('./services/order').then(o => o.orderAPI.getSellerOrders(1, 10, 1)),
      ]).then(([unread, sellerOrders]) => {
        if (unread > 0) {
          toast.info(`您有 ${unread} 条未读消息`, { duration: 8000, closeButton: true });
        }
        if ((sellerOrders.total || 0) > 0) {
          toast.info(`您有 ${sellerOrders.total} 个待发货订单`, { duration: 8000, closeButton: true });
        }
      }).catch(() => {});
    }
  }, [isAuthenticated, user]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />}
          />

          <Route path="/" element={<Layout />}>
            {/* 公开页面 */}
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />

            {/* 需认证页面 */}
            <Route index element={isAuthenticated ? <Home /> : <Navigate to="/products" replace />} />
            <Route path="publish" element={isAuthenticated ? <ProductCreate /> : <Navigate to="/login" replace />} />
            <Route path="publish/:id" element={isAuthenticated ? <ProductEdit /> : <Navigate to="/login" replace />} />
            <Route path="products/create" element={isAuthenticated ? <ProductCreate /> : <Navigate to="/login" replace />} />
            <Route path="products/edit/:id" element={isAuthenticated ? <ProductEdit /> : <Navigate to="/login" replace />} />
            <Route path="messages" element={isAuthenticated ? <Messages /> : <Navigate to="/login" replace />} />
            <Route path="messages/:productId/:otherUserId" element={isAuthenticated ? <Messages /> : <Navigate to="/login" replace />} />
            <Route path="favorites" element={isAuthenticated ? <Favorites /> : <Navigate to="/login" replace />} />
            <Route path="orders" element={isAuthenticated ? <Orders /> : <Navigate to="/login" replace />} />
            <Route path="orders/:id" element={isAuthenticated ? <Orders /> : <Navigate to="/login" replace />} />
            <Route path="my-products" element={isAuthenticated ? <MyProducts /> : <Navigate to="/login" replace />} />
            <Route path="profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} />
            <Route path="profile/edit" element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} />
            <Route path="profile/password" element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} />
            <Route path="profile/addresses" element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        expand={false}
        richColors
        closeButton
        duration={4000}
        style={{ top: '5rem' }}
        className="!top-16 md:!top-20"
      />
    </>
  );
}

export default App;
