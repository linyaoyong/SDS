# Campus Trade API Guide

## Base URL
- Development: `http://localhost:8080`

## Authentication
- JWT Bearer token in Authorization header
- Login: `POST /api/auth/login` returns accessToken + refreshToken
- Refresh: `POST /api/auth/refresh` — frontend auto-refreshes on 40003/40004
- Token expiry: accessToken 24h, refreshToken 30d (stored in Redis)

## Error Codes
| Code Range | Service | Examples |
|-----------|---------|---------|
| 200 | Success | - |
| 40001-40099 | auth-service | 40001 用户名已存在, 40002 用户名或密码错误, 40003 token无效/过期, 40004 refreshToken无效/过期 |
| 40100-40199 | product-service | 40100 商品不存在, 40102 库存不足, 40108 请先下架商品再编辑 |
| 40200-40299 | order-service | 40200 订单不存在, 40201 不可自买, 40205 操作冲突 |
| 40300-40399 | message-service | 40300 会话不存在, 40302 不可与自己对话 |
| 50000-50099 | system | 50000 服务器内部错误, 50002 参数校验失败 |

Frontend: `code >= 40000` = business error.

## Pagination
- page: 1-based, default 1
- size: default 20, max 100
- Response: `{ code, message, data: [...], total, page, size }`

## Static Resources
- Path: `/static/**` or `/api/static/**` (both served from local `./static` directory)
- Avatar: `/static/avatars/<userId>_<timestamp>.jpg`
- Product image: `/static/products/<productId>_<timestamp>.jpg`
- Upload: `POST /api/upload/avatar` (auth-service), `POST /api/products/upload/{id}` (product-service)

## WebSocket
- URL: `ws://localhost:8080/ws/chat?token={jwt}`
- Heartbeat: Client sends `{"type":"PING"}` every 30s, server replies `{"type":"PONG"}`
- Timeout: Server closes after 90s inactivity; client reconnects with exponential backoff (max 5 retries)
- Message types: `NEW_MESSAGE`, `SYSTEM_NOTICE`, `TOKEN_EXPIRED`
- Send messages via REST `POST /api/messages`, WebSocket is receive-only

## Key API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login (credential: username/phone/email/studentId) |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/users/me` | Current user profile |
| PUT | `/api/users/me` | Update profile |
| PUT | `/api/users/me/password` | Change password |
| POST | `/api/upload/avatar` | Upload avatar (multipart, max 5MB) |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List/search (keyword, categoryId, mine, page, size, sortBy) |
| GET | `/api/products/{id}` | Product detail |
| POST | `/api/products` | Create product |
| PUT | `/api/products/{id}` | Edit product (auto-handles LISTED→OFF_SHELF→LISTED) |
| PUT | `/api/products/{id}/off-shelf` | Off-shelf |
| PUT | `/api/products/{id}/re-list` | Re-list |
| DELETE | `/api/products/{id}` | Delete (soft) |
| POST | `/api/products/{id}/images` | Add image URL (max 9) |
| DELETE | `/api/products/{id}/images/{index}` | Remove image |
| PUT | `/api/products/{id}/images/sort` | Reorder images |
| POST | `/api/products/{id}/like` | Like |
| DELETE | `/api/products/{id}/like` | Unlike |
| GET | `/api/products/likes` | My liked products |
| GET | `/api/categories` | Category tree (L1 + L2) |
| GET | `/api/favorites` | My favorites |
| POST | `/api/favorites/{productId}` | Add favorite |
| DELETE | `/api/favorites/{productId}` | Remove favorite |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/orders` | Create order |
| GET | `/api/orders?role=buyer\|seller&status=&page=&size=` | My orders |
| GET | `/api/orders/{id}` | Order detail |
| PUT | `/api/orders/{id}/pay` | Pay (simulated) |
| PUT | `/api/orders/{id}/deliver` | Mark shipped (seller) |
| PUT | `/api/orders/{id}/complete` | Confirm receipt (buyer) |
| PUT | `/api/orders/{id}/cancel` | Cancel (needs cancelReason) |
| POST | `/api/orders/{id}/review` | Submit review |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/messages/conversations` | Conversation list |
| GET | `/api/messages/conversations/{productId}?otherUserId=&page=&size=` | Message history |
| POST | `/api/messages` | Send message |
| GET | `/api/messages/unread-count` | Total unread count |
| PUT | `/api/messages/conversations/read?productId=&otherUserId=` | Mark conversation read |

> See main design doc (`docs/superpowers/specs/2026-06-03-campus-trade-design.md`) for complete API reference.
