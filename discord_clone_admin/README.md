# Discord Clone - Admin Dashboard (Flutter)

Hệ thống quản trị dành cho dự án Discord Clone, được xây dựng bằng Flutter, cung cấp các công cụ mạnh mẽ để theo dõi và điều hành toàn bộ hệ thống.

## 📌 Tính năng chính
*   **Thống kê doanh thu:** Biểu đồ tăng trưởng doanh thu từ gói Nitro theo ngày/tháng.
*   **Quản lý người dùng:** Xem danh sách, khóa/mở khóa tài khoản người dùng.
*   **Kiểm duyệt nội dung:** Xem và xử lý các báo cáo vi phạm (Reports) từ người dùng.
*   **Hệ thống hiệu ứng:** Quản lý và thêm mới các hiệu ứng hồ sơ (Avatar frames, Banners).
*   **Audit Logs:** Theo dõi lịch sử các hành động quan trọng trên toàn hệ thống.

## 🛠 Yêu cầu hệ thống (Prerequisites)
*   **Flutter SDK (v3.x+)**.
*   **Dart SDK**.
*   Các nền tảng hỗ trợ: Windows, macOS, Linux hoặc Web.

## 🚀 Hướng dẫn cài đặt

### 1. Cài đặt Dependencies
Truy cập thư mục `discord_clone_admin` và chạy:
```bash
flutter pub get
```

### 2. Cấu hình API
Mở file `lib/core/config/app_env.dart` để kiểm tra hoặc thay đổi `baseUrl`.
Bạn cũng có thể chạy ứng dụng với tham số `API_BASE_URL` tùy chỉnh:
```bash
flutter run --dart-define=API_BASE_URL=http://your-api-url/api
```

### 3. Khởi chạy ứng dụng
```bash
# Chạy trên Windows (Desktop)
flutter run -d windows

# Chạy trên trình duyệt Web
flutter run -d chrome
```

## 📂 Cấu trúc thư mục
*   `lib/features/`: Chứa các module chức năng (Dashboard, Moderation, Revenue...).
*   `lib/core/`: Chứa các cấu hình hệ thống, theme, và network client.
*   `lib/shared/`: Các widget và helper dùng chung toàn dự án.

## 🎨 Giao diện
Ứng dụng sử dụng ngôn ngữ thiết kế **Material 3** với tông màu tối đồng bộ với hệ sinh thái Discord, mang lại trải nghiệm làm việc chuyên nghiệp cho người quản trị.
