import { useEffect, useState } from 'react';
import { orderAPI } from '../services/order';
import { reviewAPI } from '../services/review';
import type { OrderDTO } from '../types/api';
import { ORDER_STATUS_MAP } from '../types/api';
import { Package, Clock, CheckCircle, XCircle, Truck, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getLatestReview } from '../utils/review-history';

const STATUS_FILTERS: { label: string; value: number | undefined }[] = [
  { label: '进行中', value: -1 },  // -1 表示前端过滤 status 0/1/2
  { label: '待付款', value: 0 },
  { label: '待发货', value: 1 },
  { label: '待收货', value: 2 },
  { label: '已完成', value: 3 },
  { label: '已取消', value: 4 },
];

/** 进行中：待付款/待发货/待收货 */
const ACTIVE_STATUSES = [0, 1, 2];

export default function Orders() {
  const navigate = useNavigate();
  const [buyerOrders, setBuyerOrders] = useState<OrderDTO[]>([]);
  const [sellerOrders, setSellerOrders] = useState<OrderDTO[]>([]);
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>('buyer');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(-1); // 默认"进行中"
  const [loading, setLoading] = useState(true);
  const [reviewingOrder, setReviewingOrder] = useState<OrderDTO | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewHistoryLoading, setReviewHistoryLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [activeTab, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // statusFilter === -1 表示"进行中"，需前端过滤
      const apiStatus = statusFilter === -1 ? undefined : statusFilter;
      if (activeTab === 'buyer') {
        const data = await orderAPI.getBuyerOrders(1, 50, apiStatus);
        setBuyerOrders(statusFilter === -1
          ? data.data.filter(o => ACTIVE_STATUSES.includes(o.status))
          : data.data);
      } else {
        const data = await orderAPI.getSellerOrders(1, 50, apiStatus);
        setSellerOrders(statusFilter === -1
          ? data.data.filter(o => ACTIVE_STATUSES.includes(o.status))
          : data.data);
      }
    } catch (error) {
      toast.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (orderId: number) => {
    try {
      await orderAPI.pay(orderId);
      toast.success('支付成功');
      fetchOrders();
    } catch (error) {
      toast.error('支付失败');
    }
  };

  const handleDeliver = async (orderId: number) => {
    try {
      await orderAPI.deliver(orderId);
      toast.success('已标记发货');
      fetchOrders();
    } catch (error) {
      toast.error('发货操作失败');
    }
  };

  const handleComplete = async (orderId: number) => {
    try {
      await orderAPI.complete(orderId);
      toast.success('已确认收货');
      fetchOrders();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleCancel = async (orderId: number) => {
    try {
      await orderAPI.cancel(orderId, '用户取消');
      toast.success('订单已取消');
      fetchOrders();
    } catch (error) {
      toast.error('取消订单失败');
    }
  };

  const openReview = async (order: OrderDTO) => {
    setReviewingOrder(order);
    setReviewRating(0);
    setReviewContent('');
    setReviewHistoryLoading(true);
    try {
      const latest = getLatestReview(await reviewAPI.getOrderReviewHistory(order.id));
      if (latest) {
        setReviewRating(latest.rating);
        setReviewContent(latest.content);
      }
    } catch {
      toast.error('加载历史评价失败，可直接重新评价');
    } finally {
      setReviewHistoryLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewingOrder) return;
    if (reviewRating === 0) {
      toast.error('请选择评分');
      return;
    }
    setReviewLoading(true);
    try {
      await reviewAPI.createReview(reviewingOrder.id, reviewRating, reviewContent);
      toast.success('评价提交成功');
      setReviewingOrder(null);
      setReviewRating(0);
      setReviewContent('');
      fetchOrders();
    } catch (error: any) {
      toast.error(error?.message || '评价提交失败');
    } finally {
      setReviewLoading(false);
    }
  };

  const currentOrders = activeTab === 'buyer' ? buyerOrders : sellerOrders;

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">我的订单</h1>

      {/* 角色标签页 */}
      <div className="mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => { setActiveTab('buyer'); setStatusFilter(undefined); }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'buyer'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              我买的 ({buyerOrders.length})
            </button>
            <button
              onClick={() => { setActiveTab('seller'); setStatusFilter(undefined); }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'seller'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              我卖的 ({sellerOrders.length})
            </button>
          </nav>
        </div>
      </div>

      {/* 状态筛选标签 */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map(sf => (
          <button
            key={sf.label}
            onClick={() => setStatusFilter(sf.value)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              statusFilter === sf.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* 订单列表 */}
      {currentOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">暂无订单</p>
          <p className="text-gray-500 mt-2">
            {activeTab === 'buyer' ? '去购买一些商品吧！' : '发布一些商品等待买家下单！'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {currentOrders.map((order) => {
            const statusInfo = ORDER_STATUS_MAP[order.status] || { label: '未知', color: 'text-gray-600 bg-gray-100' };
            const isBuyer = activeTab === 'buyer';

            return (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${statusInfo.color}`}>
                      {order.status === 0 && <Clock className="h-5 w-5" />}
                      {order.status === 1 && <CheckCircle className="h-5 w-5" />}
                      {order.status === 2 && <Truck className="h-5 w-5" />}
                      {order.status === 3 && <CheckCircle className="h-5 w-5" />}
                      {order.status === 4 && <XCircle className="h-5 w-5" />}
                      {order.status === 6 && <Clock className="h-5 w-5" />}
                    </div>
                    <span className={`font-medium ${statusInfo.color.split(' ')[0]}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <h4
                      className="font-medium text-blue-600 hover:text-blue-800 mb-1 cursor-pointer"
                      onClick={() => navigate(`/products/${order.productId}`)}
                    >
                      {order.productTitle}
                    </h4>
                    <p className="text-sm text-gray-600">数量: {order.quantity}</p>
                    <p className="text-sm text-gray-600">单价: ¥{order.unitPrice}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">
                      {isBuyer ? '卖家' : '买家'}: {isBuyer ? order.sellerName : order.buyerName}
                    </p>
                    <p className="text-sm text-gray-600">订单号: {order.orderNo}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">总价: ¥{order.totalAmount}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  {/* Buyer actions */}
                  {isBuyer && order.status === 0 && (
                    <>
                      <button
                        onClick={() => handlePay(order.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        去支付
                      </button>
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="border border-red-600 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors text-sm"
                      >
                        取消
                      </button>
                    </>
                  )}
                  {/* Both parties can cancel in PAID status */}
                  {order.status === 1 && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      className="border border-red-600 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors text-sm"
                    >
                      取消订单
                    </button>
                  )}
                  {isBuyer && order.status === 2 && (
                    <button
                      onClick={() => handleComplete(order.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      确认收货
                    </button>
                  )}
                  {isBuyer && order.status === 3 && (
                    <button
                      onClick={() => openReview(order)}
                      className="border border-blue-600 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm"
                    >
                      评价
                    </button>
                  )}

                  {/* Seller actions */}
                  {!isBuyer && order.status === 0 && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      className="border border-red-600 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors text-sm"
                    >
                      取消
                    </button>
                  )}
                  {!isBuyer && order.status === 1 && (
                    <button
                      onClick={() => handleDeliver(order.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      去发货
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 评价弹窗 */}
      {reviewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">评价商品</h3>
              <button
                onClick={() => { setReviewingOrder(null); setReviewRating(0); setReviewContent(''); }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 bg-gray-50 p-3 rounded">
              <p className="font-medium text-gray-900">{reviewingOrder.productTitle}</p>
              <p className="text-sm text-gray-500 mt-1">订单号: {reviewingOrder.orderNo}</p>
            </div>

            {/* 星级评分 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">评分</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    disabled={reviewHistoryLoading}
                    className="focus:outline-none disabled:opacity-50"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= reviewRating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 评价内容 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">评价内容</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="说说你对商品的看法..."
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                disabled={reviewHistoryLoading}
              />
            </div>

            <button
              onClick={handleReviewSubmit}
              disabled={reviewLoading || reviewHistoryLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {reviewHistoryLoading ? '加载历史评价...' : reviewLoading ? '提交中...' : '提交评价'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
