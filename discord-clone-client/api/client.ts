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
  timeout: 15000,
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

// Response Interceptor: Bắt lỗi 401/403 để xử lý đăng xuất
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || "";

    // 401: Token hết hạn
    // 403 + message "vô hiệu hóa": Tài khoản bị khóa
    if (status === 401 || (status === 403 && (message.includes("vô hiệu hóa") || message.includes("vô hiệu hoá")))) {
      if (status === 401) {
        console.warn("⚠️ Token hết hạn hoặc không hợp lệ (401). Đang dọn dẹp...");
      } else {
        console.warn("🚫 Tài khoản bị vô hiệu hóa (403). Đang buộc đăng xuất...");
      }

      try {
        const { useAuthStore } = require("@/store/useAuthStore");
        const logout = useAuthStore.getState().logout;
        if (logout) {
          await logout();
        } else {
          await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
        }
        
        // Có thể thêm thông báo Toast ở đây nếu cần
      } catch (removeError) {
        console.error("❌ Lỗi khi tự động đăng xuất:", removeError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;