# Discord Clone - Frontend Ecosystem

Chào mừng bạn đến với hệ sinh thái Frontend của dự án Discord Clone. Thư mục này chứa hai ứng dụng chính được phát triển trên các nền tảng khác nhau để phục vụ các mục đích riêng biệt.

## 📂 Danh sách dự án con

### 1. [Mobile Client (React Native/Expo)](./discord-clone-client)
Ứng dụng di động dành cho người dùng cuối, hỗ trợ nhắn tin thời gian thực, gọi thoại/video và quản lý server.
*   **Công nghệ:** React Native, Expo, Agora SDK, Socket.io, Zustand.
*   **Hướng dẫn nhanh:**
    ```bash
    cd discord-clone-client
    npm install
    npx expo start
    ```
*   👉 [Xem hướng dẫn chi tiết tại đây](./discord-clone-client/README.md)

### 2. [Admin Dashboard (Flutter)](./discord_clone_admin)
Hệ thống quản trị web/desktop dành cho người điều hành để theo dõi doanh thu, quản lý người dùng và kiểm duyệt nội dung.
*   **Công nghệ:** Flutter, Material 3, GetX/Provider.
*   **Hướng dẫn nhanh:**
    ```bash
    cd discord_clone_admin
    flutter pub get
    flutter run -d windows # hoặc chrome
    ```
*   👉 [Xem hướng dẫn chi tiết tại đây](./discord_clone_admin/README.md)

## 🚀 Luồng khởi chạy chung

Để hệ thống hoạt động đầy đủ, bạn cần thực hiện theo thứ tự:
1.  **Khởi động Backend:** Đảm bảo Server Spring Boot đã chạy tại cổng `8085`.
2.  **Cấu hình IP:** Cập nhật địa chỉ IP máy tính vào file `.env` của thư mục `discord-clone-client`.
3.  **Chạy ứng dụng:** Khởi chạy Mobile Client hoặc Admin Dashboard tùy theo mục đích sử dụng.

---
*Lưu ý: Đảm bảo thiết bị di động (hoặc máy ảo) và máy tính chạy backend cùng kết nối chung một mạng nội bộ.*
