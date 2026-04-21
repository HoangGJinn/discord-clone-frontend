# Discord Clone Mobile App - Phân Chia Công Việc

> Phiên bản: 1.0
> Ngày: 2026-04-04
> Backend: Spring Boot 3.5.9 + MySQL + MongoDB
> API Base URL: `http://localhost:8085/api`

---

## Tổng Quan Project

### Backend Features (Đã có sẵn)

| Module | Mô tả | Database |
|--------|-------|----------|
| **Auth** | Đăng ký, đăng nhập, OTP email, quên/mật khẩu | MySQL |
| **User** | Profile, avatar, trạng thái (Online/Idle/DND/Offline) | MySQL |
| **Server** | Tạo, join, rời server, invite code | MySQL |
| **Category** | Nhóm channels trong server | MySQL |
| **Channel** | Text channel & Voice channel | MySQL |
| **Message** | Chat trong channel ( reactions, pinned, attachments) | MongoDB |
| **Direct Message** | Chat riêng tư 1-1, conversations | MongoDB |
| **Friend** | Kết bạn, block, pending requests | MySQL |
| **Search** | Tìm kiếm servers, channels, members | MySQL |
| **Voice** | Voice chat qua Agora SDK | - |
| **File Upload** | Upload ảnh/file lên Cloudinary | Cloudinary |
| **Payment** | Thanh toán Nitro qua VNPay | MySQL |
| **Presence** | Cập nhật trạng thái online qua WebSocket | MySQL |

---

## PHẦN 1: MOBILE APP (GIAO DIỆN DISCORD)

### Người phụ trách 1 (Dev 1): **Core Features & Server Management**

#### 1. Authentication Module (Auth)
- [ ] **Login Screen**
  - Form đăng nhập: username + password
  - "Forgot Password?" link
  - Loading state, error handling
  - Lưu JWT token sau khi login thành công
  - API: `POST /api/auth/login`

- [ ] **Register Screen**
  - Form: username, email, password, confirm password
  - Validation input
  - Redirect sang màn hình Verify OTP sau khi đăng ký
  - API: `POST /api/auth/register`

- [ ] **Verify OTP Screen**
  - Nhập mã OTP (6 số) từ email
  - Resend OTP button
  - Đếm ngược thời gian resend (60s)
  - API: `POST /api/auth/verify-account`, `POST /api/auth/resend-otp`

- [ ] **Forgot Password Flow**
  - Nhập email -> nhận OTP -> đặt lại mật khẩu mới
  - API: `POST /api/auth/forget-password`, `POST /api/auth/reset-password`

#### 2. Server Management Module
- [ ] **Server List Screen (Sidebar)**
  - Hiển thị danh sách server đã tham gia (avatar icon)
  - Server có thông báo badge
  - Nút tạo server mới
  - API: `GET /api/servers/my-servers`

- [ ] **Create Server Screen**
  - Nhập tên server
  - Upload icon server
  - Chọn loại: Public/Private
  - API: `POST /api/servers`, `POST /api/upload`

- [ ] **Server Detail Screen**
  - Header: tên server, mô tả, icon
  - Invite button -> share link/code
  - Member list
  - Server settings (nếu là owner/admin)
  - API: `GET /api/servers/{serverId}/details`, `GET /api/servers/{serverId}/members`

- [ ] **Join Server Screen**
  - Nhập invite code
  - Preview server info trước khi join
  - API: `POST /api/servers/join`

- [ ] **Server Settings Screen** (Owner/Admin only)
  - Chỉnh sửa tên, mô tả, icon
  - Quản lý invite code (tạo mới)
  - Xóa server (Owner only)
  - API: `PUT /api/servers/{serverId}`, `POST /api/servers/{serverId}/invite-code`, `DELETE /api/servers/{serverId}`

#### 3. Channel & Category Management Module
- [ ] **Channel List (Sidebar)**
  - Hiển thị categories và channels theo thứ tự
  - Icon khác nhau cho TEXT vs VOICE channel
  - Voice channel: hiện số người đang trong kênh
  - Right-click/long-press: edit, delete (admin only)
  - API: `GET /api/servers/{serverId}/channels`, `GET /api/servers/{serverId}/categories`

- [ ] **Create/Edit Channel Dialog**
  - Text channel: name, topic
  - Voice channel: name, bitrate, user limit
  - Chọn category (dropdown)
  - API: `POST /api/servers/{serverId}/channels`, `PUT /api/channels/{channelId}`

- [ ] **Create/Edit Category Dialog**
  - Tên category
  - Sắp xếp thứ tự
  - API: `POST /api/servers/{serverId}/categories`, `PUT /api/categories/{categoryId}`

#### 4. Member Management
- [ ] **Member List Screen**
  - Hiển thị danh sách thành viên
  - Phân loại: Owner, Admin, Member
  - Search member trong server
  - Kick/Ban (admin only)
  - Change role (owner only)
  - API: `GET /api/servers/{serverId}/members`, `GET /api/search/members`

---

### Người phụ trách 2 (Dev 2): **Chat, Social & Real-time**

#### 5. Chat Module (Text Channel)
- [ ] **Chat Screen**
  - Message list (infinite scroll, load more)
  - Hiển thị: avatar, username, timestamp, content
  - Reactions badge
  - Reply indicator
  - Pinned messages section
  - Message input với emoji picker
  - Attachment button (upload ảnh/file)
  - API: `GET /api/channels/{channelId}/messages`

- [ ] **Send Message**
  - Text message
  - Gửi emoji reaction
  - Reply to message
  - (Real-time: WebSocket `/topic/channel/{channelId}`)
  - API: WebSocket STOMP

- [ ] **Message Actions**
  - Edit message (own message)
  - Delete message (own message hoặc admin)
  - Pin/Unpin message
  - Add/remove reaction
  - API: `PUT /api/messages/{messageId}`, `DELETE /api/messages/{messageId}`, `POST /api/messages/{messageId}/reactions`

#### 6. Direct Message (DM) Module
- [ ] **DM List Screen**
  - Hiển thị conversation list
  - Avatar, username, last message preview, time
  - Unread badge
  - Online status indicator
  - API: `GET /api/direct-messages/conversations`

- [ ] **DM Chat Screen**
  - Tương tự Chat Screen
  - Thêm thông tin user ở header
  - Call button (voice/video)
  - API: `GET /api/direct-messages/conversation/{conversationId}`, WebSocket `/topic/dm/{conversationId}`

- [ ] **DM Actions**
  - Send, edit, delete message
  - Add/remove reactions
  - Block user
  - API: `POST /api/direct-messages`, `PUT /api/direct-messages/{messageId}`, `DELETE /api/direct-messages/{messageId}`

#### 7. Voice Channel Module
- [ ] **Voice Channel UI**
  - Hiển thị người đang trong voice channel
  - Mute/Unmute, Deafen buttons
  - Leave channel button
  - Join voice button (từ channel list)
  - API: `GET /api/voice/token`, WebSocket voice state

- [ ] **Voice Connection**
  - Connect/disconnect voice
  - Hiện thị người đang speak (audio indicator)
  - Volume control
  - Sử dụng Agora RTC SDK

#### 8. Friend System Module
- [ ] **Friend List Screen**
  - Tab: All Friends / Pending Requests / Sent Requests
  - Online friends section
  - Start DM button
  - Unfriend button
  - API: `GET /api/friends`, `GET /api/friends/requests/received`, `GET /api/friends/requests/sent`

- [ ] **Add Friend Screen**
  - Search user by username/email
  - Send friend request
  - Block user option
  - API: `GET /api/users/search`, `POST /api/friends/request/{receiverId}`

- [ ] **Friend Request Actions**
  - Accept/Reject request
  - Cancel sent request
  - API: `PUT /api/friends/{friendshipId}/accept`, `PUT /api/friends/{friendshipId}/reject`, `DELETE /api/friends/request/{friendshipId}`

#### 9. User Profile Module
- [ ] **My Profile Screen**
  - Avatar, username, display name
  - Edit profile: display name, bio, birthdate, country, pronouns
  - Change avatar
  - Change password
  - API: `GET /api/users/me`, `PUT /api/users/profile`

- [ ] **User Status Selector**
  - Online (Xanh lá)
  - Idle (Vàng - trăng)
  - DND - Do Not Disturb (Đỏ)
  - Không có Offline (tự động khi đóng app)
  - API: `PUT /api/users/me/status`

- [ ] **View Other User Profile**
  - Avatar, username, display name, bio
  - Mutual servers
  - Start DM button
  - Add Friend / Block button
  - API: `GET /api/users/{id}`

#### 10. Search Module
- [ ] **Global Search**
  - Search bar trên header
  - Tìm kiếm: Servers, Channels, Categories, Members
  - Fuzzy search (gần đúng)
  - API: `GET /api/search`, `GET /api/search/servers`, `GET /api/search/channels`, `GET /api/search/members`

---

## PHẦN 2: ADMIN PANEL (Quản lý Discord App)

> **Ghi chú**: Đây là phần mở rộng, cần thêm backend endpoints mới hoặc điều chỉnh security

### Người phụ trách 1 (Dev 1): **User & Server Administration**

#### 11. Admin Authentication
- [x] **Admin Login Screen**
  - Separate admin login page
  - JWT token riêng cho admin
  - Role-based access: `ROLE_ADMIN`

- [x] **Admin Dashboard**
  - Thống kê tổng quan: users, servers, messages, active users
  - Quick actions

#### 12. User Management (Admin)
- [x] **User List Screen**
  - Bảng: username, email, status, created date, last active
  - Phân trang, sort, filter
  - Search user
  - API: `GET /api/admin/users`

- [x] **User Detail/Edit Screen**
  - Xem chi tiết thông tin user
  - Disable/Enable account
  - Reset password
  - View user's servers, messages
  - Ban user (xóa quyền truy cập)
  - API: `GET /api/admin/users/{id}`, `PUT /api/admin/users/{id}`

- [x] **User Statistics**
  - Số messages đã gửi
  - Số servers tham gia
  - Số friends
  - Activity timeline

#### 13. Server Management (Admin)
- [x] **Server List Screen**
  - Bảng: tên, owner, số members, ngày tạo
  - Filter: all, active, inactive
  - Search server
  - API: `GET /api/admin/servers`

- [x] **Server Detail Screen**
  - Thông tin chi tiết server
  - Danh sách channels
  - Danh sách members
  - Xem messages
  - API: `GET /api/admin/servers/{id}`

- [x] **Server Actions**
  - Force delete server
  - View server logs
  - Warn owner
  - API: `DELETE /api/admin/servers/{id}`

---

### Người phụ trách 2 (Dev 2): **Content & Analytics Administration**

#### 14. Content Moderation
- [x] **Reported Messages Screen**
  - Danh sách messages bị report
  - Xem nội dung, context
  - Actions: delete message, warn user, ban user
  - API: Bảng `reported_messages` + endpoints

- [x] **Auto-moderation Settings**
  - Block words/phrases (Blacklist management)
  - Add/Remove keywords

- [x] **Audit Log**
  - Log các hành động admin
  - Ai đã làm gì, khi nào
  - Filter theo action type, admin, targetType

#### 15. Analytics Dashboard
- [x] **Overview Dashboard**
  - Total users (registered, active)
  - Total servers
  - Total messages
  - Daily/Weekly/Monthly active users
  - Growth charts (fl_chart LineChart)
  - API: `GET /api/admin/stats/overview`, `GET /api/admin/stats/user-growth`, `GET /api/admin/stats/top-servers`

- [x] **User Analytics**
  - New users over time
  - User growth line chart

- [x] **Server Analytics**
  - Top servers by members
  - Server list with member/channel counts

- [x] **Engagement Analytics**
  - Messages per day (overview stats)
  - Revenue tracking

#### 16. Payment Management (Admin)
- [x] **Nitro Orders List**
  - Bảng: user, amount, status, date
  - Filter chips: All/Pending/Confirmed/Failed
  - API: `GET /api/admin/payment/orders`

- [x] **Order Detail**
  - Chi tiết giao dịch
  - Approve/Reject buttons cho PENDING orders
  - API: `GET /api/admin/payment/orders/{txnRef}`

- [x] **Revenue Report**
  - Tổng doanh thu, số đơn, tỉ lệ thành công
  - Revenue stats cards
  - API: `GET /api/admin/payment/stats`

---

## PHẦN 3: SHARED TASKS (Cả 2 cùng làm)

### 17. Core Infrastructure
- [ ] **API Service Layer**
  - Base API client setup
  - Authentication interceptor (attach JWT)
  - Error handling (401, 403, 500)
  - Retry logic

- [ ] **WebSocket Setup**
  - STOMP client configuration
  - Connection management
  - Reconnection logic
  - Subscribe/unsubscribe helpers

- [ ] **State Management**
  - Auth state (user, token)
  - WebSocket state (connected channels)
  - Cache management

- [ ] **Navigation Structure**
  - Tab: Home (Servers) | DM | Friends | Profile
  - Stack navigation
  - Deep linking support

### 18. Common Components
- [ ] **Avatar Component**
  - Hiển thị avatar với fallback initials
  - Online status badge
  - Size variants (sm, md, lg)

- [ ] **Message Bubble**
  - Text message
  - Attachment preview (image, file)
  - Reactions display
  - Reply preview

- [ ] **Loading States**
  - Skeleton loaders
  - Pull-to-refresh
  - Infinite scroll loader

- [ ] **Error States**
  - Network error
  - Empty states
  - Retry options

### 19. Testing
- [ ] **Unit Tests**
  - API service tests
  - State management tests
  - Utility function tests

- [ ] **Integration Tests**
  - Login flow
  - Send message flow
  - Join server flow

---

## Thứ Tự Ưu Tiên

### Phase 1: MVP (4-6 tuần)
1. Auth (Login, Register, OTP) - **Dev 1**
2. Server Management - **Dev 1**
3. Channel & Category - **Dev 1**
4. Chat Module - **Dev 2**
5. DM Module - **Dev 2**
6. Friend System - **Dev 2**

### Phase 2: Enhanced (2-3 tuần)
7. Voice Channel - **Dev 2**
8. User Profile & Status - **Dev 2**
9. Search - **Cả 2**
10. File Upload - **Cả 2**

### Phase 3: Admin Panel (3-4 tuần)
11. Admin Auth & Dashboard - **Dev 1**
12. User Management Admin - **Dev 1**
13. Server Management Admin - **Dev 1**
14. Content Moderation - **Dev 2**
15. Analytics - **Dev 2**
16. Payment Management - **Dev 2**

---

## API Reference Summary

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/verify-account` | Xác thực OTP |
| POST | `/api/auth/resend-otp` | Gửi lại OTP |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/forget-password` | Quên mật khẩu |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu |

### Users
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/users/me` | Lấy thông tin user hiện tại |
| PUT | `/api/users/profile` | Cập nhật profile |
| PUT | `/api/users/me/status` | Cập nhật trạng thái |
| GET | `/api/users/{id}` | Lấy thông tin user theo ID |
| GET | `/api/users/search` | Tìm kiếm user |

### Servers
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/servers` | Tạo server |
| GET | `/api/servers/my-servers` | Danh sách server của tôi |
| GET | `/api/servers/{serverId}` | Thông tin server |
| GET | `/api/servers/{serverId}/details` | Chi tiết server |
| PUT | `/api/servers/{serverId}` | Cập nhật server |
| DELETE | `/api/servers/{serverId}` | Xóa server |
| POST | `/api/servers/join` | Join server |
| POST | `/api/servers/{serverId}/leave` | Rời server |
| POST | `/api/servers/{serverId}/invite-code` | Tạo invite code mới |
| GET | `/api/servers/{serverId}/members` | Danh sách thành viên |

### Categories
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/servers/{serverId}/categories` | Tạo category |
| GET | `/api/servers/{serverId}/categories` | Danh sách categories |
| PUT | `/api/categories/{categoryId}` | Cập nhật category |
| DELETE | `/api/categories/{categoryId}` | Xóa category |

### Channels
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/servers/{serverId}/channels` | Tạo channel |
| GET | `/api/servers/{serverId}/channels` | Danh sách channels |
| GET | `/api/categories/{categoryId}/channels` | Channels theo category |
| PUT | `/api/channels/{channelId}` | Cập nhật channel |
| DELETE | `/api/channels/{channelId}` | Xóa channel |

### Messages (Channel)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/channels/{channelId}/messages` | Lấy messages |
| PUT | `/api/messages/{messageId}` | Sửa message |
| DELETE | `/api/messages/{messageId}` | Xóa message |
| POST | `/api/messages/{messageId}/reactions` | Thêm reaction |
| DELETE | `/api/messages/{messageId}/reactions` | Xóa reaction |

### Direct Messages
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/direct-messages/conversations` | Danh sách conversations |
| POST | `/api/direct-messages` | Gửi DM |
| GET | `/api/direct-messages/conversation/{conversationId}` | Messages trong conversation |
| GET | `/api/direct-messages/conversation/by-user/{friendId}` | Tạo/get conversation với user |
| PUT | `/api/direct-messages/{messageId}` | Sửa DM |
| DELETE | `/api/direct-messages/{messageId}` | Xóa DM |
| POST | `/api/direct-messages/{messageId}/reactions` | Thêm reaction |
| DELETE | `/api/direct-messages/{messageId}/reactions` | Xóa reaction |

### Friends
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/friends` | Danh sách bạn bè |
| GET | `/api/friends/requests/received` | Lời mời nhận được |
| GET | `/api/friends/requests/sent` | Lời mời đã gửi |
| POST | `/api/friends/request/{receiverId}` | Gửi lời mời |
| DELETE | `/api/friends/request/{friendshipId}` | Hủy lời mời |
| PUT | `/api/friends/{friendshipId}/accept` | Chấp nhận |
| PUT | `/api/friends/{friendshipId}/reject` | Từ chối |
| DELETE | `/api/friends/{friendshipId}` | Xóa bạn |
| POST | `/api/friends/block/{targetUserId}` | Block user |

### Search
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/search` | Tìm kiếm tổng hợp |
| GET | `/api/search/servers` | Tìm servers |
| GET | `/api/search/channels` | Tìm channels |
| GET | `/api/search/members` | Tìm members |

### Voice
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/voice/token` | Lấy Agora token |

### File Upload
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/upload` | Upload file |

### Payment
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/payment/nitro/create` | Tạo thanh toán Nitro |
| GET | `/api/payment/vnpay-ipn` | VNPay IPN callback |
| POST | `/api/payment/nitro/confirm-mobile` | Confirm payment (mobile) |
| GET | `/api/payment/order/{txnRef}` | Trạng thái order |

### WebSocket Topics
| Topic | Mô tả |
|-------|-------|
| `/topic/channel/{channelId}` | Real-time channel messages |
| `/topic/dm/{conversationId}` | Real-time DM messages |
| `/topic/voice/{channelId}` | Voice channel state |
| `/topic/presence` | User presence updates |
| `/user/queue/dm` | Personal DM queue |

---

## Database Schema Overview

### MySQL Tables
- `users` - Người dùng
- `roles` - Vai trò (USER, ADMIN)
- `user_roles` - Mapping user-role
- `servers` - Servers
- `categories` - Categories trong server
- `channels` - Channels (TEXT/VOICE)
- `server_members` - Thành viên server
- `friendships` - Quan hệ bạn bè
- `nitro_orders` - Đơn hàng Nitro
- `password_reset_otps` - OTP đặt lại mật khẩu

### MongoDB Collections
- `channel_messages` - Tin nhắn channel
- `direct_messages` - Tin nhắn riêng tư
- `conversations` - Cuộc trò chuyện

---

## Công Nghệ Đề Xuất cho Mobile

### Option A: React Native (Khuyến nghị)
- Expo cho rapid development
- React Navigation
- Zustand/Jotai cho state management
- Axios cho API calls
- react-native-gifted-chat cho chat UI
- react-native-agora cho voice/video

### Option B: Flutter
- flutter_bloc cho state management
- dio cho API calls
- flutter_webrtc cho voice/video
- Firebase Cloud Messaging cho notifications

### Option C: Native (iOS/Android)
- SwiftUI + Swift (iOS)
- Jetpack Compose + Kotlin (Android)
- Cần viết riêng API layer

---

## Notes

1. **Backend URL**: `http://localhost:8085/api` (development)
2. **JWT Token**: Lưu trong secure storage, attach vào header `Authorization: Bearer <token>`
3. **Real-time**: Sử dụng STOMP over WebSocket cho messages và presence
4. **Voice**: Agora SDK cần config App ID và Certificate
5. **VNPay**: Cần config VNPay merchant info
6. **Cloudinary**: Đã config, upload qua `/api/upload`
