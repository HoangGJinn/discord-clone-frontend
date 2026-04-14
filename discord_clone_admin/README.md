# Discord Clone Admin

Flutter admin app đã được nối login thật với backend Spring Boot.

## Cấu hình biến môi trường

App đọc biến compile-time `API_BASE_URL` bằng `--dart-define` hoặc `--dart-define-from-file`.

### 1) Tạo file biến môi trường local

Sao chép file mẫu:

```powershell
Copy-Item .\env\dev.example.json .\env\dev.local.json
```

Chỉnh giá trị trong `env/dev.local.json`:

```json
{
	"API_BASE_URL": "http://localhost:8085/api"
}
```

### 2) Chạy app với biến môi trường

```powershell
flutter run --dart-define-from-file=env/dev.local.json
```

## Lưu ý khi trỏ localhost

- Android Emulator: dùng `http://10.0.2.2:8085/api`
- iOS Simulator / Windows / macOS / Linux / Web: dùng `http://localhost:8085/api`

Nếu bạn không truyền `API_BASE_URL`, app sẽ tự fallback:

- Android -> `http://10.0.2.2:8085/api`
- Nền tảng khác -> `http://localhost:8085/api`

## API đã nối

- `POST /api/auth/login`
- `GET /api/users/me` (để kiểm tra quyền `ADMIN`)

Nếu account không có role `ADMIN`, app sẽ báo lỗi và không cho login vào admin panel.
