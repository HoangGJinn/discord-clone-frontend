import apiClient from "@/api/client";
import authService, {
  ForgotPasswordRequest,
  LoginRequest,
  ResendOtpRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserProfileResponse,
  VerifyAccountRequest,
} from "@/services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import socketService from "@/services/socketService";

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  displayName?: string;
  status?: string;
  role: string[];
  bio?: string;
  birthDate?: string;
  country?: string;
  pronouns?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasInitialized: boolean;
  login: (user: User, token: string) => Promise<void>;
  loginWithCredentials: (payload: LoginRequest) => Promise<void>;
  registerAccount: (payload: RegisterRequest) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordRequest) => Promise<void>;
  resetPassword: (payload: ResetPasswordRequest) => Promise<void>;
  verifyAccount: (payload: VerifyAccountRequest) => Promise<void>;
  resendOtp: (payload: ResendOtpRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
}

const extractErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    if (maybeError.response?.data?.message) {
      return String(maybeError.response.data.message);
    }
    if (maybeError.message) {
      return String(maybeError.message);
    }
  }
  return fallbackMessage;
};

const mapProfileToUser = (profile: UserProfileResponse): User => ({
  id: String(profile.id),
  username: profile.username,
  email: profile.email ?? "",
  avatar: profile.avatarUrl ?? undefined,
  displayName: profile.displayName ?? undefined,
  status: profile.status ?? undefined,
  role: Array.isArray(profile.roles) ? profile.roles : [],
  bio: profile.bio ?? undefined,
  birthDate: profile.birthDate ?? undefined,
  country: profile.country ?? undefined,
  pronouns: profile.pronouns ?? undefined,
});

let initializePromise: Promise<void> | null = null;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Request timeout"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  hasInitialized: false,

  login: async (user, token) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false, hasInitialized: true });
    socketService.connect();
  },

  loginWithCredentials: async (payload) => {
    set({ isLoading: true });
    try {
      const loginData = await authService.login(payload);
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, loginData.token);

      let resolvedUser: User;
      try {
        const profile = await authService.getMe();
        resolvedUser = mapProfileToUser(profile);
      } catch {
        resolvedUser = {
          id: String(loginData.userId),
          username: loginData.userName,
          email: "",
          role: [],
        };
      }

      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(resolvedUser));
      set({
        user: resolvedUser,
        token: loginData.token,
        isAuthenticated: true,
        isLoading: false,
        hasInitialized: true,
      });
      socketService.connect();
    } catch (error) {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        hasInitialized: true,
      });
      throw new Error(extractErrorMessage(error, "Đăng nhập thất bại"));
    }
  },

  registerAccount: async (payload) => {
    try {
      await authService.register(payload);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Đăng ký thất bại"));
    }
  },

  forgotPassword: async (payload) => {
    try {
      await authService.forgotPassword(payload);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Gửi OTP thất bại"));
    }
  },

  resetPassword: async (payload) => {
    try {
      await authService.resetPassword(payload);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Đặt lại mật khẩu thất bại"));
    }
  },

  verifyAccount: async (payload) => {
    try {
      await authService.verifyAccount(payload);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Xác thực tài khoản thất bại"));
    }
  },

  resendOtp: async (payload) => {
    try {
      await authService.resendOtp(payload);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Gửi lại OTP thất bại"));
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    set({ user: null, token: null, isAuthenticated: false, isLoading: false, hasInitialized: true });
    socketService.disconnect();
  },

  updateUser: (userData) => {
    set((state) => {
      const newUser = state.user ? { ...state.user, ...userData } : null;
      if (newUser) {
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
      }
      return { user: newUser };
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    if (get().hasInitialized) return;
    if (initializePromise) {
      await initializePromise;
      return;
    }

    initializePromise = (async () => {
      try {
        set({ isLoading: true });
        const [token, userStr] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        // Debug startup auth state in AsyncStorage
        let accountCount = 0;
        if (userStr) {
          try {
            const parsed = JSON.parse(userStr);
            accountCount = parsed ? 1 : 0; // current app uses single-session storage
          } catch {
            accountCount = 0;
          }
        }
        if (accountCount === 0) {
          console.log("[AuthInit] AsyncStorage: không có account");
        } else {
          console.log(`[AuthInit] AsyncStorage: đang có ${accountCount} account`);
        }

        if (!token) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            hasInitialized: true,
          });
          return;
        }

        const storedUser = userStr ? (JSON.parse(userStr) as User) : null;
        set({ token, user: storedUser, isAuthenticated: true });

        try {
          const profileResponse = await withTimeout(
            apiClient.get<UserProfileResponse>("/users/me"),
            10000,
          );
          const latestUser = mapProfileToUser(profileResponse.data);
          await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(latestUser));
          set({ user: latestUser, isAuthenticated: true, isLoading: false, hasInitialized: true });
          socketService.connect();
        } catch (error) {
          const statusCode =
            typeof error === "object" && error !== null
              ? (error as { response?: { status?: number } }).response?.status
              : undefined;

          if (!storedUser || statusCode === 401) {
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            await AsyncStorage.removeItem(AUTH_USER_KEY);
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              hasInitialized: true,
            });
            return;
          }
          set({ isLoading: false, hasInitialized: true });
        }
      } catch (err) {
        console.error("Failed to initialize auth store:", err);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          hasInitialized: true,
        });
      } finally {
        initializePromise = null;
      }
    })();

    await initializePromise;
  },
}));
