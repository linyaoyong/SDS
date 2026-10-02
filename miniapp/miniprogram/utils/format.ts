/**
 * 格式化工具函数
 */

/** 格式化价格（保留两位小数） */
export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null) return '0.00';
  return price.toFixed(2);
}

/** 格式化日期为可读字符串 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** 格式化完整日期时间 */
export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${dd} ${h}:${min}`;
}

/** 截断文本 */
export function truncate(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen) + '...';
}

/** 显示 toast */
export function showToast(title: string, icon: 'success' | 'error' | 'loading' | 'none' = 'none'): void {
  wx.showToast({ title, icon, duration: 2000 });
}

/** 显示加载中 */
export function showLoading(title = '加载中...'): void {
  wx.showLoading({ title, mask: true });
}

/** 隐藏加载中 */
export function hideLoading(): void {
  wx.hideLoading();
}
