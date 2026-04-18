import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8085/api";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor (Attach Token)
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor (Handle 401/Logout?)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle Unauthorized (e.g. clear token or redirect to login)
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("auth_user");
    }
    return Promise.reject(error);
  },
);

export default apiClient;
