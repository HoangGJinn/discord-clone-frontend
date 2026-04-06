# Kế hoạch phát triển Flutter 7 Ngày (Dev 2: Chat, Social & Real-time)

Tài liệu này được nén lại để hoàn thành các nhiệm vụ quan trọng trong vòng **7 ngày**. Bạn là **Dev 2**, tập trung vào Chat, Bạn bè, Profile và Voice Chat.

---

## 1. Kiểm tra Backend
✅ **Trạng thái**: Backend đã hoàn thiện cơ bản các Controller cần thiết cho bạn:
- `FriendController`: Quản lý bạn bè.
- `MessageController` & `ChatController`: Chat trong channel.
- `DirectMessageController`: Chat 1-1.
- `VoiceController`: Token cho Agora Voice.
- `UserController`: Profile và Status.
- `SearchController`: Tìm kiếm.
- `FileUploadController`: Upload ảnh icon/avatar.

---

## 2. Roadmap 7 Ngày Cấp Tốc (High Intensity)

### Ngày 1: Hạ tầng & Hệ thống Bạn bè
- [ ] **Infrastructure**: Setup `Dio` (với interceptors lưu trữ JWT), `Stomp` client (WebSocket), và `GoRouter`.
- [ ] **Friend List**: Màn hình danh sách bạn bè với 3 tab (Tất cả, Chờ, Đã gửi).
- [ ] **Social Actions**: Gửi lời mời kết bạn, Chấp nhận/Từ chối.

### Ngày 2: Direct Message (DM) & Real-time
- [ ] **DM List**: Hiển thị danh sách các cuộc hội thoại 1-1 gần nhất.
- [ ] **DM Chat UI**: Màn hình chat riêng tư.
- [ ] **Real-time**: Lắng nghe tin nhắn DM qua WebSocket để hiển thị ngay lập tức (Topic: `/user/queue/dm`).

### Ngày 3: Chat Channel (Phần quan trọng nhất)
- [ ] **Chat Screen**: Layout danh sách tin nhắn (hiển thị Avatar, Username, Time).
- [ ] **Infinite Scroll**: Tự động load tin nhắn cũ khi kéo lên trên.
- [ ] **Message Input**: Gửi tin nhắn text và Emoji.

### Ngày 4: Tin nhắn nâng cao & Profile
- [ ] **Message Actions**: Nhấn giữ tin nhắn để Sửa, Xóa, Pin hoặc thả Reactions.
- [ ] **Profile Screen**: Chỉnh sửa tên, Bio, ngày sinh.
- [ ] **Status Selector**: Toggle trạng thái Trực tuyến, Chờ, Đừng làm phiền (API: `/api/users/me/status`).

### Ngày 5: Media & Tìm kiếm
- [ ] **File Upload**: Tích hợp `image_picker` và API `/api/upload` để gửi ảnh trong chat/đổi avatar.
- [ ] **Global Search**: Màn hình tìm kiếm server, channel và người dùng.
- [ ] **Rich Preview**: Hiển thị ảnh và link đính kèm trong chat.

### Ngày 6: Voice Chat (Agora SDK)
- [ ] **Voice Setup**: Cài đặt `agora_rtc_engine`, lấy token từ API `/api/voice/token`.
- [ ] **Voice UI**: Hiển thị danh sách người đang trong kênh voice, indicator khi có người đang nói.
- [ ] **Voice Controls**: Mute, Deafen, và Rời kênh.

### Ngày 7: Tích hợp & Hoàn thiện
- [ ] **Integration**: Kết nối với phần Login và Server List của Dev 1.
- [ ] **Bug Fixing**: Kiểm tra tính ổn định của WebSocket khi mất mạng.
- [ ] **Polishing**: Thêm các animation chuyển cảnh, Skeleton loading để app trông chuyên nghiệp hơn.

---

## 3. Checklist Kỹ thuật 7 Ngày
- [ ] Token JWT phải được lưu vào `flutter_secure_storage`.
- [ ] Sử dụng `BLoC` để quản lý luồng tin nhắn (ChatBloc, DMBloc).
- [ ] Mọi hình ảnh nên được bọc trong `CachedNetworkImage`.
- [ ] WebSocket nên có logic tự động kết nối lại (Auto-reconnect).

---
> **Lưu ý**: Lộ trình này yêu cầu bạn tập trung cao độ. Hãy chia nhỏ thời gian sáng làm giao diện (UI), chiều tích hợp API và tối xử lý WebSocket/Real-time. Chúc bạn thành công!
