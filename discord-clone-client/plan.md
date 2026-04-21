# Kế hoạch phát triển Frontend (Dev 2: Customer & Admin) - 10 NGÀY TỔNG LỰC

> **Phiên bản**: 2.0 (cập nhật sau kiểm tra thực tế)
> **Ngày cập nhật**: 2026-04-17
> **Backend**: Spring Boot 3.5.9 + MySQL + MongoDB
> **API Base URL**: `http://localhost:8085/api`

---

## GIAI ĐOẠN 1: CUSTOMER APP (5 NGÀY - REACT NATIVE) - ✅ HOÀN TẤT 95%

### Ngày 1: Hạ tầng & Xã hội (Infrastructure & Friends) - ✅ HOÀN TẤT
- [x] **Infrastructure**: Cấu hình Axios (Bearer token), StompJS (WebSocket), Zustand.
- [x] **Friend System**: Màn hình danh sách bạn bè (Tất cả, Chờ, Đã gửi).
- [x] **Social Actions**: Gửi/Hủy/Chấp nhận lời mời kết bạn (API: `FriendController`).
- [x] **Profile Basic**: Màn hình xem thông tin cá nhân.

### Ngày 2: Chat 1-1 & Real-time (DM & WebSocket) - ✅ HOÀN TẤT
- [x] **DM List**: Hiển thị danh sách hội thoại DM gần nhất.
- [x] **DMChatScreen**: Màn hình chat text riêng tư.
- [x] **Real-time**: Lắng nghe tin nhắn tức thời qua WebSocket (`/user/queue/dm`).

### Ngày 3: Chat Channel & Hiệu năng (Channel Chat) - ✅ HOÀN TẤT
- [x] **Channel Chat UI**: Layout danh sách tin nhắn chuyên nghiệp.
- [x] **Infinite Scroll**: Load thêm tin nhắn cũ khi kéo lên trên.
- [x] **Message Input**: Gửi nhanh tin nhắn text & Emoji.

### Ngày 4: Tin nhắn nâng cao & Media (Rich Chat & Search) - ✅ HOÀN TẤT
- [x] **Reactions & Media**: UI thả emoji, gửi ảnh qua API `/api/upload`.
- [x] **Message Actions**: Ghim, sửa, xóa tin nhắn.
- [x] **Global Search**: Tìm kiếm nhanh Server, Channel, Người dùng.

### Ngày 5: Voice Chat & Hoàn thiện Customer (Voice & Polish) - ✅ HOÀN TẤT
- [x] **Voice Call**: Tích hợp UI Voice Call (Join/Leave, Mute/Deafen).
- [x] **Presence**: Toggle trạng thái Trực tuyến/Chờ/Đừng làm phiền.
- [x] **Integration**: Ghép nối với Login/Server của Dev 1 và Build test bản mobile.

---

## GIAI ĐOẠN 2: ADMIN PANEL (5 NGÀY - FLUTTER)

### ⚠️ TRẠNG THÁI BACKEND ADMIN HIỆN TẠI:
**Backend hiện chưa có bất kỳ Admin API nào.** Cần phát triển mới các endpoint:
- Admin authentication với role `ROLE_ADMIN`
- User management endpoints (`GET /api/admin/users`, `PUT /api/admin/users/{id}`)
- Server management endpoints (`GET /api/admin/servers`, `DELETE /api/admin/servers/{id}`)
- Reported messages system (cần tạo bảng `reports` trong DB)
- Auto-moderation blacklist endpoints
- Audit log endpoints
- Analytics stats endpoints (`GET /api/admin/stats/overview`)
- Nitro order admin endpoints (đã có `NitroPaymentController` nhưng chưa có admin view)

---

### Ngày 6: Hạ tầng Flutter & Dashboard (Admin Shell)

**Mục tiêu**: Thiết lập project Flutter Admin + Admin Login + Dashboard tổng quan

#### [FEATURE MỚI] Flutter Admin Project Setup
- [x] **Flutter Project**: Tạo project Flutter mới cho Admin Panel
  - Cấu hình theme Discord-inspired
  - Navigation drawer/sidebar
  - Protected routes cho admin

#### [CẦN BACKEND MỚI] Admin Authentication
- [x] **Backend API**: `POST /api/admin/login`
  - Separate từ user login (cùng endpoint nhưng check role ADMIN)
  - Hoặc tới `/api/auth/admin/login` riêng biệt
  - Trả về JWT token với `ROLE_ADMIN`
  - Frontend kiểm tra `user.roles` chứa `ADMIN`
- [x] **Admin Login Screen** (Flutter)
  - Form đăng nhập: username/email + password
  - Kiểm tra role sau khi login
  - Nếu không phải ADMIN → hiển thị lỗi "Không có quyền truy cập"
  - Lưu admin token riêng (hoặc reuse token chung với role check)
- [x] **Route Guard**: Chặn truy cập admin routes nếu không có role ADMIN

#### [CẦN BACKEND MỚI] Dashboard Shell
- [x] **Backend API**: `GET /api/admin/stats/overview`
  ```json
  {
    "totalUsers": 1234,
    "activeUsers": 567,
    "totalServers": 89,
    "totalMessages": 45678,
    "totalRevenue": 1234567,
    "dailyActiveUsers": [/* 7 ngày gần nhất */]
  }
  ```
- [x] **Dashboard UI** (Flutter)
  - Cards thống kê nhanh:
    - Tổng User (registered + active)
    - Tổng Server
    - Tổng Messages
    - Tổng Doanh thu (VNPay confirmed)
  - Revenue chart (7 ngày gần nhất)
  - Quick actions: View Users, View Servers, Moderation

---

### Ngày 7: Quản lý Nội dung (Content Moderation)

**Mục tiêu**: Moderation tools cho admin

#### [CẦN BACKEND MỚI] Reported Messages System
- [x] **Database**: Tạo bảng `reported_messages`
  ```sql
  CREATE TABLE reported_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    message_id VARCHAR(36),
    reported_by_user_id BIGINT,
    reason ENUM('SPAM', 'HARASSMENT', 'HATE_SPEECH', 'OTHER'),
    description TEXT,
    status ENUM('PENDING', 'REVIEWED', 'RESOLVED'),
    reviewed_by_admin_id BIGINT NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [x] **Backend API**:
  - `GET /api/admin/reports` - Danh sách reports (pagination, filter by status)
  - `GET /api/admin/reports/{reportId}` - Chi tiết report
  - `PUT /api/admin/reports/{reportId}/resolve` - Mark as resolved
  - `DELETE /api/admin/reports/{reportId}` - Delete report
- [x] **Frontend UI** (Flutter):
  - Reported Messages Screen: List reports với message content, reporter, reason
  - Detail view: hiển thị context (các tin nhắn xung quanh)
  - Actions: Delete message, Warn user, Ban user

#### [CẦN BACKEND MỚI] Moderation Actions
- [x] **Backend API**:
  - `DELETE /api/admin/messages/{messageId}` - Xóa message (any user's message)
  - `PUT /api/admin/users/{userId}/warn` - Gửi cảnh cáo (tạo bảng warnings)
  - `PUT /api/admin/users/{userId}/ban` - Ban user (set `is_active = false`)
  - `PUT /api/admin/users/{userId}/unban` - Unban user
- [x] **Frontend UI** (Flutter):
  - Moderation Action Buttons trong Reported Messages detail
  - Confirm dialogs trước khi thực hiện action

#### [CẦN BACKEND MỚI] Auto-moderation Blacklist
- [x] **Database**: Tạo bảng `auto_mod_blacklist`
  ```sql
  CREATE TABLE auto_mod_blacklist (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    keyword VARCHAR(255) UNIQUE,
    created_by_admin_id BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [x] **Backend API**:
  - `GET /api/admin/moderation/blacklist` - Lấy danh sách từ khóa
  - `POST /api/admin/moderation/blacklist` - Thêm từ khóa mới
  - `DELETE /api/admin/moderation/blacklist/{id}` - Xóa từ khóa
- [x] **Frontend UI** (Flutter):
  - Blacklist management screen
  - Add/Remove keywords
  - Toggle auto-moderation on/off (global setting)

---

### Ngày 8: Phân tích Số liệu (Analytics Dashboard) - ✅ HOÀN TẤT

#### [CẦN BACKEND MỚI] User & Server Analytics
- [x] **Backend API**:
  - `GET /api/admin/stats/user-growth` - User growth theo ngày/tuần/tháng
  - `GET /api/admin/stats/user-retention` - Retention rate (Day 1, 7, 30)
  - `GET /api/admin/stats/top-servers` - Top 10 servers by members/messages
  - `GET /api/admin/stats/engagement` - Messages per day, peak hours
- [x] **Frontend UI** (Flutter):
  - Line charts cho user growth (using `fl_chart`)
  - Bar charts cho top servers
  - Metrics cards cho engagement stats

---

### Ngày 9: Quản lý Nitro & Doanh thu (Nitro & Payment) - ✅ HOÀN TẤT

#### [CẦN BACKEND MỚI] Nitro Order Admin
- [x] **Backend API** (AdminController):
  - `GET /api/admin/payment/orders` - Danh sách tất cả orders (filter by status)
  - `GET /api/admin/payment/orders/{txnRef}` - Chi tiết order
  - `PUT /api/admin/payment/orders/{txnRef}/approve` - Manual approve
  - `PUT /api/admin/payment/orders/{txnRef}/reject` - Manual reject
  - `GET /api/admin/payment/stats` - Revenue stats (tổng doanh thu, đơn hàng)
- [x] **Frontend UI** (Flutter):
  - Orders list: User, Amount, Status, Date
  - Filter chips: All/Pending/Confirmed/Failed
  - Approve/Reject buttons cho PENDING orders
  - Revenue summary cards (doanh thu, đơn hàng, tỉ lệ thành công)

---

### Ngày 10: Nhật ký & Đóng gói Admin (Audit Logs & Build) - ✅ HOÀN TẤT

#### [CẦN BACKEND MỚI] Audit Logs
- [x] **Database**: Bảng `audit_logs` (JPA entity AuditLog.java)
- [x] **Backend API**:
  - `GET /api/admin/audit-logs` - List logs (filter by admin, action, targetType)
  - `GET /api/admin/audit-logs/{logId}` - Chi tiết log
  - Specification-based filtering với JpaSpecificationExecutor
- [x] **Frontend UI** (Flutter):
  - Audit Log screen: action, actor, target, timestamp, IP
  - Filters: Action type chips (All/User/Server/Payment/System/Danger)
  - Search bar cho tìm kiếm theo action/actor
  - Date range picker
  - Scroll-based pagination

#### Final Polish
- [x] **Backend**: Security cho admin endpoints
  - Tất cả `/api/admin/**` có `@PreAuthorize("hasAuthority('ADMIN')")`
- [x] **Frontend**: UI/UX
  - Loading states, error handling
  - Empty states cho các danh sách
  - Confirm dialogs cho approve/reject/delete actions

---

## PHẦN 3: SHARED TASKS (CẢ 2 CÙNG LÀM) - ✅ HOÀN TẤT

### 17. Core Infrastructure - ✅ HOÀN TẤT
- [x] **API Service Layer**: Axios client, JWT interceptor, error handling
- [x] **WebSocket Setup**: STOMP client, connection management
- [x] **State Management**: Zustand cho auth, friends, servers, messages
- [x] **Navigation Structure**: Tab navigation, Stack navigation

### 18. Common Components - ✅ HOÀN TẤT
- [x] **Avatar Component**: With fallback initials, online status
- [x] **Message Bubble**: Text, reactions, reply preview
- [x] **Loading States**: Skeleton, pull-to-refresh
- [x] **Error States**: Network error, empty states

### 19. Testing - ✅ HOÀN TẤT (cơ bản)
- [x] **Unit Tests**: Manual testing
- [x] **Integration Tests**: Manual testing các flow chính

---

## TỔNG KẾT TIẾN ĐỘ

### Customer App (React Native) - 95% ✅
**Hoàn tất:**
- ✅ Authentication (Login, Register, OTP, Forgot Password)
- ✅ Server Management (CRUD, Join, Invite)
- ✅ Channel & Category Management
- ✅ Member Management (List, Search - Kick/Ban API backend chưa)
- ✅ Channel Chat (Real-time, Reactions, Edit/Delete, Pin, Media)
- ✅ Direct Messages (Conversations, Chat)
- ✅ Friend System (Full)
- ✅ User Profile & Status
- ✅ Global Search
- ✅ Voice Call UI (Agora)
- ✅ Presence & Real-time updates

**Chưa hoàn tất (5%):**
- ⚠️ Kick/Ban member (backend API chưa có)
- ⚠️ Voice call connection hoàn chỉnh (cần test Agora)

### Admin Panel (Flutter) - 100% ✅
**Đã hoàn tất (Days 6-10):**
- ✅ Flutter project setup, User/Server Management
- ✅ Cấu trúc Auth (Đăng nhập admin)
- ✅ Dashboard với stats API + Charts (fl_chart)
- ✅ Tích hợp API Moderation (Blacklist, Warn, Ban, Delete Message)
- ✅ Moderation UI (Report UI chi tiết)
- ✅ Analytics (User Growth LineChart, Top Servers)
- ✅ Payment/Nitro order management (List, Approve/Reject, Revenue Stats)
- ✅ Audit logs (Real API, Filter, Pagination, Date Picker)

---

## BACKEND API CẦN BỔ SUNG CHO ADMIN

### Priority 1 (Day 6-7): Core Admin & Moderation
1. `POST /api/admin/login` - Admin login (hoặc reuse `/api/auth/login` + role check)
2. `GET /api/admin/stats/overview` - Dashboard stats
3. `GET /api/admin/users` - User list (pagination, filter, search)
4. `GET /api/admin/users/{id}` - User detail
5. `PUT /api/admin/users/{id}/disable` - Disable/enable account
6. `PUT /api/admin/users/{id}/ban` - Ban user
7. `GET /api/admin/servers` - Server list
8. `DELETE /api/admin/servers/{id}` - Force delete server
9. `POST /api/admin/reports` - Create report (frontend gọi khi user report message)
10. `GET /api/admin/reports` - List reports
11. `PUT /api/admin/reports/{id}/resolve` - Resolve report
12. `DELETE /api/admin/messages/{id}` - Delete any message
13. `POST /api/admin/moderation/blacklist` - Add blacklisted word
14. `GET /api/admin/moderation/blacklist` - List blacklisted words
15. `DELETE /api/admin/moderation/blacklist/{id}` - Remove word

### Priority 2 (Day 8-9): Analytics & Payments
16. `GET /api/admin/stats/user-growth` - User growth data
17. `GET /api/admin/stats/user-retention` - Retention metrics
18. `GET /api/admin/stats/top-servers` - Top servers
19. `GET /api/admin/stats/engagement` - Engagement stats
20. `GET /api/payment/admin/orders` - Nitro orders list
21. `GET /api/payment/admin/orders/{txnRef}` - Order detail
22. `PUT /api/payment/admin/orders/{txnRef}/approve` - Approve manually
23. `PUT /api/payment/admin/orders/{txnRef}/reject` - Reject manually

### Priority 3 (Day 10): Audit & Polish
24. `POST /api/admin/audit-logs` - Log admin action
25. `GET /api/admin/audit-logs` - List audit logs
26. `GET /api/admin/audit-logs/{id}` - Log detail

---

## LƯU Ý QUAN TRỌNG

1. **Security**: Tất cả admin endpoints phải có `@PreAuthorize("hasRole('ADMIN')")` hoặc `@PreAuthorize("hasAuthority('ROLE_ADMIN')")`
2. **Database Migration**: Cần tạo migration SQL cho các bảng mới (reports, auto_mod_blacklist, audit_logs)
3. **Frontend Tech Stack**:
   - Flutter 3.x+
   - Provider hoặc Riverpod cho state management
   - Dio cho API calls
   - `fl_chart` hoặc `syncfusion_flutter_charts` cho charts
   - `webview_flutter` nếu cần embed web dashboard
4. **Timeline**: 10 ngày cho 2 phần là rất căng thẳng. Ưu tiên:
   - Day 6: Admin Login + Dashboard (có thể dùng data giả nếu backend chưa xong)
   - Day 7: Reported Messages + Moderation Actions
   - Day 8-9: Analytics + Payments
   - Day 10: Audit Logs + Polish + Build
5. **Testing**: Backend cần unit test admin endpoints; Flutter cần widget test cho các screens.

---

> **Chiến lược**: Phát triển song song - backend và frontend admin có thể làm song song nếu trước đó đã thống nhất API contracts. Nếu backend chậm, frontend có thể dùng mock data trước.
