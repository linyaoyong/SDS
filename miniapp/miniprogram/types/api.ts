// ============================================================
// SDS 新后端 API 类型定义 (对齐设计文档 2026-06-03)
// ============================================================

/** 统一 API 响应 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  total?: number;
  page?: number;
  size?: number;
}

/** 分页响应 — data 为数组，分页元数据在顶层 */
export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
}

// ---- Auth ----

export interface LoginRequest {
  credential: string;  // 用户名/手机号/邮箱/学号
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  username: string;
  avatarUrl: string | null;
}

export interface RegisterRequest {
  username: string;
  password: string;
  phone: string;
  email: string;
  studentId: string;
  name: string;
}

// ---- User ----

export interface UserDTO {
  id: number;
  username: string;
  phone: string;
  email: string;
  studentId: string;
  name: string;
  school?: string;
  college?: string;
  major?: string;
  grade?: string;
  gender: number;       // 0未知/1男/2女
  avatarUrl?: string;
  role: number;          // 0学生/1管理员/2超级管理员
  status: number;        // 0正常/1冻结
  creditScore: number;  // 1.00-5.00
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserRequest {
  username?: string;
  phone?: string;
  name?: string;
  school?: string;
  college?: string;
  major?: string;
  grade?: string;
  gender?: number;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface UserPublicResponse {
  id: number;
  username: string;
  name: string;
  avatarUrl?: string;
  school?: string;
  college?: string;
}

// ---- Address ----

export interface Address {
  id: number;
  userId: number;
  receiverName: string;
  receiverPhone: string;
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
  postalCode?: string;
  isDefault: number;
  tag?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressRequest {
  receiverName: string;
  receiverPhone: string;
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
  postalCode?: string;
  isDefault?: number;
  tag?: string;
}

// ---- Product ----

export interface ProductDTO {
  id: number;
  title: string;
  description: string;
  categoryId: number;
  categoryName?: string;
  parentCategoryId?: number;
  parentCategoryName?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  images: string[];
  condition: number;       // 1-10 (1=1成新, 10=全新)
  tags?: string;           // JSON 字符串，后端返回
  tagList?: string[];      // 前端解析后使用
  sellerId: number;
  sellerName: string;
  sellerAvatar?: string;
  status: number;          // 1=LISTED 2=SOLD 3=OFF_SHELF
  statusName?: string;
  viewCount: number;
  likeCount: number;
  favoriteCount: number;
  soldCount: number;
  location?: string;
  isFavorited?: boolean;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreateRequest {
  title: string;
  description: string;
  categoryId: number;
  price: number;
  originalPrice?: number;
  stockQuantity: number;
  condition: number;
  tags?: string[];        // 前端自由标签
  location?: string;
  images: string[];       // 传空数组 []，创建后再上传
}

// Category 树节点
export interface CategoryDTO {
  id: number;
  name: string;
  description?: string;
  parentId: number | null;
  icon?: string;
  sortOrder: number;
  level: number;           // 0一级/1二级
  status: number;          // 0禁用/1启用
  children?: CategoryDTO[];
}

// ---- Order ----

export interface OrderDTO {
  id: number;
  orderNo: string;
  buyerId: number;
  buyerName: string;
  buyerAvatar?: string;
  sellerId: number;
  sellerName: string;
  sellerAvatar?: string;
  productId: number;
  productTitle: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  status: number;          // 0待付款/1已付款/2已发货/3已完成/4已取消/6库存扣减失败
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  cancelReason?: string;
  paidAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Message ----

export interface MessageDTO {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  receiverId: number;
  receiverName: string;
  receiverAvatar?: string;
  relatedId: number;
  relatedType: string;    // 'PRODUCT'
  orderId?: number;
  messageType: string;    // 'TEXT' | 'SYSTEM'
  content: string;
  images?: string;
  isRead: number;
  readAt?: string;
  createdAt: string;
}

export interface SendMessageRequest {
  receiverId: number;
  messageType?: string;
  content: string;
  productId: number;
  orderId?: number;
}

export interface ConversationDTO {
  otherUser: { id: number; name: string; avatar?: string };
  product: { id: number; title: string };
  unreadCount: number;
  lastMessage: { content: string; createdAt: string };
  updatedAt: string;
}

// ---- Review ----

export interface ReviewDTO {
  id: number;
  orderId: number;
  productId: number;
  reviewerId: number;
  reviewerName: string;
  reviewerAvatar?: string;
  revieweeId: number;
  rating: number;
  content: string;
  createdAt: string;
}

// ---- Enums ----

export const ORDER_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: '待付款', color: 'text-yellow-600 bg-yellow-100' },
  1: { label: '已付款', color: 'text-blue-600 bg-blue-100' },
  2: { label: '已发货', color: 'text-indigo-600 bg-indigo-100' },
  3: { label: '已完成', color: 'text-green-600 bg-green-100' },
  4: { label: '已取消', color: 'text-red-600 bg-red-100' },
  6: { label: '处理中', color: 'text-orange-600 bg-orange-100' },
};

export const PRODUCT_STATUS_MAP: Record<number, string> = {
  0: '草稿',
  1: '在售',
  2: '已售出',
  3: '已下架',
};

export const CONDITION_MAP: Record<number, string> = {
  10: '全新',
  9: '99新',
  8: '95新',
  7: '9成新',
  6: '85新',
  5: '8成新',
  4: '7成新',
  3: '6成新',
  2: '5成新',
  1: '1成新',
};
