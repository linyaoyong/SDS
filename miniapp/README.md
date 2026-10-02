# 校园二手交易 — 微信小程序

基于微信小程序原生框架（glass-easel + Skyline）开发的校园二手交易平台。

## 技术栈

- **框架**: 微信小程序原生 (glass-easel 组件模型)
- **语言**: TypeScript
- **渲染引擎**: Skyline
- **状态管理**: 自定义 EventEmitter Store 单例
- **HTTP**: wx.request 封装（支持 token 注入、自动刷新、错误处理）
- **WebSocket**: wx.connectSocket（心跳 + 指数退避重连）
- **样式**: WXSS + CSS 变量 + 原子工具类

## 项目结构

```
miniprogram/
├── app.ts / app.json / app.wxss    # 入口 & 全局配置
├── sitemap.json
├── types/api.ts                     # 类型定义（从 frontend-v2 复制）
├── utils/
│   ├── http.ts                      # HTTP 客户端封装
│   └── format.ts                    # 格式化工具
├── stores/auth-store.ts             # 认证状态管理
├── services/                        # API 服务层
│   ├── auth.ts                      # 登录/注册/用户
│   ├── product.ts                   # 商品 CRUD + 收藏 + 分类
│   ├── order.ts                     # 订单操作
│   ├── message.ts                   # 消息/会话
│   ├── review.ts                    # 评价
│   └── websocket.ts                 # WebSocket 聊天
├── components/                      # 可复用组件（待实现）
└── pages/                           # 页面
    ├── home/                        # 首页（Tab）
    ├── products/                    # 商品市场（Tab）
    ├── product-detail/              # 商品详情
    ├── product-create/              # 发布商品
    ├── product-edit/                # 编辑商品
    ├── messages/                    # 消息列表（Tab）
    ├── chat/                        # 聊天窗口
    ├── favorites/                   # 我的收藏
    ├── orders/                      # 我的订单
    ├── my-products/                 # 我的商品
    ├── profile/                     # 个人中心（Tab）
    ├── login/                       # 登录
    └── register/                    # 注册
```

## 开发环境

### 前置条件
1. 后端服务已启动（localhost:8080）
2. 微信开发者工具已安装
3. 小程序 AppID: `touristappid`

### 启动步骤
1. 打开微信开发者工具
2. 导入项目，选择 `miniapp/` 目录
3. 在开发者工具中关闭"不校验合法域名"（开发阶段）
4. 点击编译预览

## API 配置

API 基础 URL: `http://localhost:8080/api`

可在 `utils/http.ts` 中修改 `API_BASE_URL`。

## 页面路由

| 页面 | 路径 | Tab |
|------|------|-----|
| 首页 | pages/home/home | ✅ |
| 商品市场 | pages/products/products | ✅ |
| 消息 | pages/messages/messages | ✅ |
| 我的 | pages/profile/profile | ✅ |
| 商品详情 | pages/product-detail/product-detail | ❌ |
| 发布商品 | pages/product-create/product-create | ❌ |
| 编辑商品 | pages/product-edit/product-edit | ❌ |
| 聊天 | pages/chat/chat | ❌ |
| 收藏 | pages/favorites/favorites | ❌ |
| 订单 | pages/orders/orders | ❌ |
| 我的商品 | pages/my-products/my-products | ❌ |
| 登录 | pages/login/login | ❌ |
| 注册 | pages/register/register | ❌ |

## 与 frontend-v2 的对应关系

所有 API 端点、参数格式、响应结构完全对齐 `frontend-v2`。可参照 `frontend-v2/src/services/` 中的 API 调用方式。
