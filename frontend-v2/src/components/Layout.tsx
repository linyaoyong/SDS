import { resolveUrl } from '../utils/api';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useWebSocketStore } from '../stores/auth';
import { webSocketService } from '../services/websocket';
import { useState, useEffect } from 'react';
import {
  User,
  ShoppingBag,
  MessageSquare,
  Heart,
  Package,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  ClipboardList,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';

/** 主 Tab 页面路径 */
const MAIN_TABS = ['/products', '/messages', '/my-products', '/orders', '/profile'];

/** 根据路径获取页面名 */
function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/products': '商品',
    '/messages': '消息',
    '/my-products': '我的商品',
    '/orders': '订单',
    '/profile': '我的',
    '/favorites': '收藏',
    '/publish': '发布商品',
    '/login': '登录',
    '/register': '注册',
  };
  if (map[pathname]) return map[pathname];
  if (pathname.startsWith('/products/') && pathname !== '/products') return '商品详情';
  if (pathname.startsWith('/publish/')) return '编辑商品';
  if (pathname.startsWith('/messages/')) return '聊天';
  if (pathname.startsWith('/orders/')) return '订单详情';
  if (pathname.startsWith('/profile/')) return '个人设置';
  return '校园二手';
}

function isMainTab(pathname: string): boolean {
  if (pathname === '/') return true;
  return MAIN_TABS.includes(pathname) || MAIN_TABS.some(t => pathname === t);
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { messages, isConnected, unreadCount, refreshUnreadCount, setUnreadCount } = useWebSocketStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  const isLoggedIn = !!user;
  const currentPath = location.pathname;
  const showBack = isLoggedIn && !isMainTab(currentPath) && currentPath !== '/';
  const pageTitle = getPageTitle(currentPath);

  useEffect(() => {
    if (isLoggedIn && user && !isConnected) {
      webSocketService.connect(user.id);
    }
    return () => {
      if (isConnected) {
        webSocketService.disconnect();
      }
    };
  }, [isLoggedIn, user, isConnected]);

  useEffect(() => {
    if (isLoggedIn) {
      refreshUnreadCount().catch(() => {});
      // 检查待处理订单（卖家待发货）
      checkPendingOrders();
    } else {
      setUnreadCount(0);
      setPendingOrderCount(0);
    }
  }, [messages, isLoggedIn, refreshUnreadCount, setUnreadCount]);

  const checkPendingOrders = async () => {
    try {
      const { orderAPI } = await import('../services/order');
      const sellerOrders = await orderAPI.getSellerOrders(1, 50, 1); // status=1 已付款待发货
      setPendingOrderCount(sellerOrders.total || 0);
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    logout();
    webSocketService.disconnect();
    toast.success('已退出登录');
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: ShoppingBag, label: '首页' },
    { path: '/products', icon: Package, label: '商品' },
    { path: '/my-products', icon: Archive, label: '我的商品' },
    { path: '/messages', icon: MessageSquare, label: '消息', badge: unreadCount },
    { path: '/favorites', icon: Heart, label: '收藏' },
    { path: '/orders', icon: ClipboardList, label: '订单', badge: pendingOrderCount },
    { path: '/profile', icon: User, label: '个人' },
  ];

  // 移动端底栏 Tab
  const mobileTabs = [
    { path: '/products', icon: Package, label: '商品' },
    { path: '/messages', icon: MessageSquare, label: '消息', badge: unreadCount },
    { path: '/my-products', icon: Archive, label: '我的商品' },
    { path: '/orders', icon: ClipboardList, label: '订单', badge: pendingOrderCount },
    { path: '/profile', icon: User, label: '我的' },
  ];

  /** 渲染 badge：桌面端显示数字，移动端显示红点 */
  const renderBadge = (badge: number | undefined, isMobile: boolean) => {
    if (!badge || badge <= 0) return null;
    if (isMobile) {
      return (
        <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
      );
    }
    return (
      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-4.5 w-4.5 flex items-center justify-center font-bold min-w-[18px]">
        {badge > 99 ? '99+' : badge}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* ====== 桌面端顶栏 ====== */}
      <nav className="hidden md:block bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
                📚 校园二手
              </Link>
            </div>
            <div className="flex items-center space-x-3 lg:space-x-5">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center space-x-1.5 px-2 py-2 rounded-lg transition-all duration-300 font-medium text-sm whitespace-nowrap ${
                    currentPath === item.path
                      ? 'text-blue-600 bg-blue-50/80'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {renderBadge(item.badge, false)}
                </Link>
              ))}
              <div className="flex items-center space-x-2 pl-3 border-l border-gray-200">
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                        {user?.avatarUrl ? (
                          <img src={resolveUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-white text-xs font-medium">{user?.name?.charAt(0) || 'U'}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700 hidden xl:block max-w-[80px] truncate">{user?.name}</span>
                    </div>
                    <button onClick={handleLogout} className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50/50 transition-all text-xs">
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link to="/login" className="px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 text-xs">登录</Link>
                    <Link to="/register" className="px-3 py-1.5 rounded-lg text-gray-700 bg-gray-100 text-xs">注册</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ====== 移动端顶栏 ====== */}
      <div className="md:hidden bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-11">
          <div className="flex items-center gap-2">
            {showBack ? (
              <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-700 hover:text-blue-600">
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">📚</span>
            )}
            <span className="font-semibold text-sm text-gray-900">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            {isLoggedIn ? (
              <button onClick={handleLogout} className="text-xs text-gray-500 px-2 py-1">退出</button>
            ) : (
              <Link to="/login" className="text-xs text-blue-600 px-2 py-1 font-medium">登录</Link>
            )}
          </div>
        </div>
      </div>

      {/* ====== 桌面端子页面返回 ====== */}
      {showBack && (
        <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
        </div>
      )}

      {/* ====== 主内容区 ====== */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isLoggedIn ? 'pb-16 md:pb-8' : 'pb-8'} py-4 md:py-8`}>
        <Outlet />
      </main>

      {/* ====== 移动端底栏 ====== */}
      {isLoggedIn && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
          <div className="flex items-center justify-around py-1.5">
            {mobileTabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center gap-0.5 py-0.5 px-2 min-w-0 relative ${
                  currentPath === tab.path || (tab.path === '/products' && currentPath === '/')
                    ? 'text-blue-600'
                    : 'text-gray-400'
                }`}
              >
                <span className="text-lg relative">
                  {renderBadge(tab.badge, true)}
                  <tab.icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ====== 桌面端汉堡菜单（保留旧逻辑） ====== */}
      <div className="hidden">
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
