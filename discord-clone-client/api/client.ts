import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { resolveApiBaseUrl } from "./networkConfig";

const API_URL = resolveApiBaseUrl();

// In ra console để dễ debug khi đang code (Có thể xóa khi deploy)
if (__DEV__) {
  console.log("🌐 API_URL đang kết nối:", API_URL);
}

// ─── Khởi tạo Axios Client ───────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // Thêm timeout 15s để tránh app bị treo vĩnh viễn khi mạng lag
});

// ─── Interceptors ────────────────────────────────────────────────────────────

// Request Interceptor: Tự động đính kèm Token vào mỗi request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("❌ Lỗi khi lấy token từ AsyncStorage:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Bắt lỗi 401 để xử lý đăng xuất
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn("⚠️ Token hết hạn hoặc không hợp lệ (401). Đang dọn dẹp...");
      try {
        // Dùng multiRemove để xóa sạch sẽ cùng lúc thay vì gọi removeItem nhiều lần
        await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
        
        // Lưu ý: Thường chỗ này bạn sẽ cần trigger một event (vd: DeviceEventEmitter) 
        // hoặc dùng Zustand/Redux để ép app chuyển thẳng về màn hình Login.
      } catch (removeError) {
        console.error("❌ Lỗi khi xóa dữ liệu auth:", removeError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;