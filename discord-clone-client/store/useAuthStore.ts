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
import { setAuthToken } from "@/services/authSession";
import { Buffer } from "buffer";

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
  isPremium: boolean;
  bio?: string;
  birthDate?: string;
  country?: string;
  pronouns?: string;
  avatarEffectId?: string;
  bannerEffectId?: string;
  cardEffectId?: string;
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
  refreshProfile: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
}

interface JwtClaims {
  isPremium?: boolean;
  premium?: boolean;
  role?: string[] | string;
  roles?: string[] | string;
  authorities?: string[] | string;
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

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
};

const parseJwtClaims = (token?: string | null): JwtClaims | null => {
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = Buffer.from(paddedBase64, "base64").toString("utf-8");

    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
};

const resolveRoles = (profileRoles: unknown, claims: JwtClaims | null): string[] => {
  const rolesFromProfile = asStringArray(profileRoles);
  if (rolesFromProfile.length > 0) {
    return rolesFromProfile;
  }

  const rolesFromClaims = [
    ...asStringArray(claims?.roles),
    ...asStringArray(claims?.role),
    ...asStringArray(claims?.authorities),
  ];

  return Array.from(new Set(rolesFromClaims));
};

const resolvePremium = (claims: JwtClaims | null, roles: string[]): boolean => {
  if (typeof claims?.isPremium === "boolean") {
    return claims.isPremium;
  }
  if (typeof claims?.premium === "boolean") {
    return claims.premium;
  }

  return roles.includes("USER_PREMIUM");
};

const mapProfileToUser = (profile: UserProfileResponse, token?: string | null): User => {
  const claims = parseJwtClaims(token);
  const role = resolveRoles(profile.roles, claims);

  return {
    id: String(profile.id),
    username: profile.username,
    email: profile.email ?? "",
    avatar: profile.avatarUrl ?? undefined,
    displayName: profile.displayName ?? undefined,
    status: profile.status ?? undefined,
    role,
    isPremium: resolvePremium(claims, role),
    bio: profile.bio ?? undefined,
    birthDate: profile.birthDate ?? undefined,
    country: profile.country ?? undefined,
    pronouns: profile.pronouns ?? undefined,
    avatarEffectId: profile.avatarEffectId ?? undefined,
    bannerEffectId: profile.bannerEffectId ?? undefined,
    cardEffectId: profile.cardEffectId ?? undefined,
  };
};

const normalizeStoredUser = (storedUser: User | null, token?: string | null): User | null => {
  if (!storedUser) return null;

  const claims = parseJwtClaims(token);
  const role = resolveRoles(storedUser.role, claims);

  return {
    ...storedUser,
    role,
    isPremium: resolvePremium(claims, role),
  };
};

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
    setAuthToken(token);
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
        resolvedUser = mapProfileToUser(profile, loginData.token);
      } catch {
        const claims = parseJwtClaims(loginData.token);
        const role = resolveRoles([], claims);
        resolvedUser = {
          id: String(loginData.userId),
          username: loginData.userName,
          email: "",
          role,
          isPremium: resolvePremium(claims, role),
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
      setAuthToken(loginData.token);
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
      setAuthToken(null);
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
    setAuthToken(null);
    socketService.disconnect();
  },

  refreshProfile: async () => {
    const token = get().token;
    if (!token) {
      return;
    }

    const profile = await authService.getMe();
    const latestUser = mapProfileToUser(profile, token);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(latestUser));
    set({ user: latestUser });
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
          setAuthToken(null);
          return;
        }

        const storedUser = userStr ? (JSON.parse(userStr) as User) : null;
        const normalizedStoredUser = normalizeStoredUser(storedUser, token);
        set({ token, user: normalizedStoredUser, isAuthenticated: true });
        setAuthToken(token);

        try {
          const profileResponse = await withTimeout(
            apiClient.get<UserProfileResponse>("/users/me"),
            10000,
          );
          const latestUser = mapProfileToUser(profileResponse.data, token);
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
            setAuthToken(null);
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
        setAuthToken(null);
      } finally {
        initializePromise = null;
      }
    })();

    await initializePromise;
  },
}));

