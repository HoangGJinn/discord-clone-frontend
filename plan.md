# Kế hoạch phát triển Frontend (Dev 2: Customer & Admin) - 10 NGÀY TỔNG LỰC

Tài liệu này bao gồm lộ trình **10 ngày dồn dập**: **5 ngày đầu (React Native - Customer)** và **5 ngày sau (Flutter - Admin)**.

---

## GIAI ĐOẠN 1: CUSTOMER APP (5 NGÀY - REACT NATIVE)

### Ngày 1: Hạ tầng & Xã hội (Infrastructure & Friends)
- [x] **Infrastructure**: Cấu hình Axios (Bearer token), StompJS (WebSocket), Zustand.
- [x] **Friend System**: Màn hình danh sách bạn bè (Tất cả, Chờ, Đã gửi).
- [x] **Social Actions**: Gửi/Hủy/Chấp nhận lời mời kết bạn (API: `FriendController`).
- [x] **Profile Basic**: Màn hình xem thông tin cá nhân.

### Ngày 2: Chat 1-1 & Real-time (DM & WebSocket)
- [x] **DM List**: Hiển thị danh sách hội thoại DM gần nhất.
- [x] **DMChatScreen**: Màn hình chat text riêng tư.
- [x] **Real-time**: Lắng nghe tin nhắn tức thời qua WebSocket (`/user/queue/dm`).

### Ngày 3: Chat Channel & Hiệu năng (Channel Chat)
- [x] **Channel Chat UI**: Layout danh sách tin nhắn chuyên nghiệp.
- [x] **Infinite Scroll**: Load thêm tin nhắn cũ khi kéo lên trên.
- [x] **Message Input**: Gửi nhanh tin nhắn text & Emoji.

### Ngày 4: Tin nhắn nâng cao & Media (Rich Chat & Search)
- [ ] **Reactions & Media**: UI thả emoji, gửi ảnh qua API `/api/upload`.
- [ ] **Message Actions**: Ghim, sửa, xóa tin nhắn.
- [ ] **Global Search**: Tìm kiếm nhanh Server, Channel, Người dùng.

### Ngày 5: Voice Chat & Hoàn thiện Customer (Voice & Polish)
- [ ] **Voice Call**: Tích hợp Agora SDK (Join/Leave, Mute/Deafen).
- [ ] **Presence**: Toggle trạng thái Trực tuyến/Chờ/Đừng làm phiền.
- [ ] **Integration**: Ghép nối với Login/Server của Dev 1 và Build test bản mobile.

---

## GIAI ĐOẠN 2: ADMIN PANEL (5 NGÀY - FLUTTER)

### Ngày 6: Hạ tầng Flutter & Dashboard (Admin Shell)
- [ ] **Flutter Setup**: Khởi tạo project Flutter Admin mới.
- [ ] **Admin Login**: Màn hình đăng nhập dành riêng cho ROLE_ADMIN.
- [ ] **Dashboard Shell**: Các thẻ thống kê nhanh (Tổng User, Server, Doanh thu).

### Ngày 7: Quản lý Nội dung (Content Moderation)
- [ ] **Reported Messages**: Danh sách tin nhắn bị cộng đồng báo cáo.
- [ ] **Moderation Actions**: Nút Xóa tin nhắn, Cảnh cáo hoặc Ban người dùng vi phạm.
- [ ] **Auto-mod UI**: Thiết lập danh sách từ khóa bị chặn (Blacklist).

### Ngày 8: Phân tích Số liệu (Analytics Dashboard)
- [ ] **User Charts**: Biểu đồ tăng trưởng người dùng và sự Retention (Lưu giữ).
- [ ] **Server Charts**: Thống kê Server lớn mạnh nhất và engagement hàng ngày.
- [ ] **API Stats**: `GET /api/admin/stats/overview`.

### Ngày 9: Quản lý Nitro & Doanh thu (Nitro & Payment)
- [ ] **Nitro Order List**: Danh sách các đơn hàng nạp Nitro từ người dùng.
- [ ] **Revenue Reports**: Biểu đồ doanh thu theo tuần/tháng (Xác nhận từ VNPay).
- [ ] **API**: `GET /api/payment/admin/orders`.

### Ngày 10: Nhật ký & Đóng gói Admin (Audit Logs & Build)
- [ ] **Audit Log**: Hiển thị lịch sử các hành động của Admin đã thực hiện.
- [ ] **Final Polish**: Tinh chỉnh UI bảng biểu Admin cho chuyên nghiệp.
- [ ] **Build**: Xuất bản Web/APK cho phần Admin.

---
> **Lưu ý cực quan trọng**: 10 ngày cho 2 công nghệ khác nhau là thử thách rất lớn. Hãy ưu tiên làm logic (API) trước, phần UI "đẹp" có thể tinh chỉnh sau cùng nếu còn thời gian. Quyết thắng!
