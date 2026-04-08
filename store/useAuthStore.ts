import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

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
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (user, token) => {
    await AsyncStorage.setItem("auth_token", token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("auth_user");
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  updateUser: (userData) => {
    set((state) => {
      const newUser = state.user ? { ...state.user, ...userData } : null;
      if (newUser) {
        AsyncStorage.setItem("auth_user", JSON.stringify(newUser));
      }
      return { user: newUser };
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem("auth_token");
      const userStr = await AsyncStorage.getItem("auth_user");

      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });
      }
    } catch (err) {
      console.error("Failed to initialize auth store:", err);
    } finally {
      set({ isLoading: false });
    }
  },
}));
