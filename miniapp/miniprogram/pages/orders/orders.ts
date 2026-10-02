/**
 * 订单管理
 */
import { orderAPI } from '../../services/order';
import { reviewAPI } from '../../services/review';
import { authStore } from '../../stores/auth-store';
import { formatPrice, showToast, showLoading, hideLoading } from '../../utils/format';
import { canSubmitReview, shouldCloseReviewDialog } from '../../utils/review-dialog';
import { getLatestReview } from '../../utils/review-history';
import type { OrderDTO } from '../../types/api';

/** 进行中：待付款/已付款(待发货)/已发货(待收货) */
const ACTIVE_STATUSES = [0, 1, 2];

const STATUS_TABS = [
  { status: -1, label: '进行中' },   // -1 表示前端过滤 status 0/1/2
  { status: -2, label: '全部' },
  { status: 0, label: '待付款' },
  { status: 1, label: '已付款' },
  { status: 2, label: '已发货' },
  { status: 3, label: '已完成' },
];

Component({
  data: {
    orders: [] as OrderDTO[],
    activeTab: 'buyer' as string,
    statusFilter: -1,           // 默认选中"进行中"
    statusTabs: STATUS_TABS,
    page: 1,
    loading: false,
    hasMore: false,
    isAuthenticated: false,
    showReview: false,
    reviewOrderId: 0,
    reviewProductId: 0,
    reviewRating: 0,
    reviewContent: '',
    reviewSubmitting: false,
    reviewHistoryLoading: false,
    errorMsg: '',
  },

  _authCb: null as any,

  lifetimes: {
    attached() {
      this._setup();
    },
    detached() {
      if (this._authCb) authStore.unsubscribe(this._authCb);
    },
  },

  methods: {
    onShow() {
      const isAuth = authStore.isAuthenticated;
      this.setData({ isAuthenticated: isAuth });
      // 每次切换到 Tab 页时重新加载数据
      if (isAuth) this.loadOrders(true);
    },
    _setup() {
      const isAuth = authStore.isAuthenticated;
      this.setData({ isAuthenticated: isAuth });
      if (!this._authCb) {
        this._authCb = (d: any) => {
          if (d.isAuthenticated) {
            this.setData({ isAuthenticated: true });
            this.loadOrders(true);
          } else {
            this.setData({ isAuthenticated: false, orders: [] });
          }
        };
        authStore.subscribe(this._authCb);
      }
    },

    switchTab(e: any) {
      const tab = e.currentTarget.dataset.tab;
      this.setData({ activeTab: tab, orders: [], page: 1 });
      this.loadOrders(true);
    },

    filterStatus(e: any) {
      const s = Number(e.currentTarget.dataset.status);
      this.setData({ statusFilter: s, orders: [], page: 1 });
      this.loadOrders(true);
    },

    async loadOrders(reset: boolean) {
      if (this.data.loading) return;
      this.setData({ loading: true, errorMsg: '' });
      try {
        const params: any = { page: reset ? 1 : this.data.page, size: 20 };
        if (this.data.statusFilter >= 0) params.status = this.data.statusFilter;
        const res = this.data.activeTab === 'buyer'
          ? await orderAPI.getBuyerOrders(params)
          : await orderAPI.getSellerOrders(params);
        var orders = reset ? res.data : [...this.data.orders, ...res.data];
        // 进行中 前端筛选: statusFilter === -1 只显示 status 0/1/2
        if (this.data.statusFilter === -1) {
          orders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
        }
        this.setData({
          orders,
          page: res.page,
          hasMore: orders.length < res.total,
          loading: false,
        });
      } catch (err: any) {
        this.setData({ loading: false, errorMsg: err.message || '加载失败' }); console.error('orders load error:', err); wx.showToast({ title: (err.message || '加载失败').slice(0, 20), icon: 'none' });
      }
    },

    async doAction(e: any) {
      const { action, id } = e.currentTarget.dataset;
      if (action === 'cancel') {
        const r = await new Promise<boolean>(resolve => {
          wx.showModal({ title: '取消订单', content: '确定要取消吗？', success: res => resolve(res.confirm) });
        });
        if (!r) return;
      }
      showLoading('处理中...');
      try {
        if (action === 'pay') await orderAPI.pay(id);
        else if (action === 'deliver') await orderAPI.deliver(id);
        else if (action === 'confirm') await orderAPI.confirm(id);
        else if (action === 'cancel') await orderAPI.cancel(id);
        hideLoading();
        showToast('操作成功', 'success');
        this.setData({ orders: [], page: 1 });
        this.loadOrders(true);
      } catch (err: any) {
        hideLoading();
        showToast(err.message || '操作失败', 'error');
      }
    },

    async openReview(e: any) {
      const id = e.currentTarget.dataset.id;
      const order = this.data.orders.find(o => o.id === id);
      if (!order) return;
      this.setData({
        showReview: true, reviewOrderId: order.id,
        reviewProductId: order.productId, reviewRating: 0, reviewContent: '',
        reviewSubmitting: false, reviewHistoryLoading: true,
      });
      try {
        const latest = getLatestReview(await reviewAPI.getOrderReviewHistory(order.id));
        if (latest && this.data.reviewOrderId === order.id) {
          this.setData({ reviewRating: latest.rating, reviewContent: latest.content });
        }
      } catch (err: any) {
        if (this.data.reviewOrderId === order.id) {
          showToast(err.message || '历史评价加载失败，可直接重新评价', 'error');
        }
      } finally {
        if (this.data.reviewOrderId === order.id) this.setData({ reviewHistoryLoading: false });
      }
    },

    closeReview() { this.setData({ showReview: false }); },
    onReviewMaskTap(e: WechatMiniprogram.TouchEvent) {
      if (shouldCloseReviewDialog(e.target.id, e.currentTarget.id)) this.closeReview();
    },
    preventReviewClose() {},
    setRating(e: any) { this.setData({ reviewRating: Number(e.currentTarget.dataset.rating) }); },
    onReviewInput(e: any) { this.setData({ reviewContent: e.detail.value }); },

    async submitReview() {
      if (this.data.reviewHistoryLoading) return;
      if (!canSubmitReview(this.data.reviewSubmitting, this.data.reviewRating)) {
        showToast('请选择评分', 'error');
        return;
      }
      this.setData({ reviewSubmitting: true });
      showLoading('提交中...');
      try {
        await reviewAPI.create(this.data.reviewOrderId, {
          rating: this.data.reviewRating,
          content: this.data.reviewContent || '好评',
        });
        showToast('评价成功', 'success');
        this.closeReview();
        this.setData({ orders: [], page: 1 });
        this.loadOrders(true);
      } catch (err: any) {
        showToast(err.message || '评价失败', 'error');
      } finally {
        hideLoading();
        this.setData({ reviewSubmitting: false });
      }
    },

    goLogin() { wx.navigateTo({ url: '/pages/login/login' }); },
  },
});
