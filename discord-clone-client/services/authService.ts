import apiClient from "@/api/client";

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  userId: number;
  userName: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthMessageResponse {
  message: string;
  email?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface VerifyAccountRequest {
  email: string;
  otp: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ResendOtpRequest {
  email: string;
  type: "VERIFY_ACCOUNT" | "RESET_PASSWORD";
}

export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  status?: string | null;
  roles?: string[] | null;
  bio?: string | null;
  birthDate?: string | null;
  country?: string | null;
  pronouns?: string | null;
}

export const authService = {
  register: async (data: RegisterRequest): Promise<AuthMessageResponse> => {
    const response = await apiClient.post<AuthMessageResponse>("/auth/register", data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/auth/login", data);
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<AuthMessageResponse> => {
    const response = await apiClient.post<AuthMessageResponse>("/auth/forget-password", data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<AuthMessageResponse> => {
    const response = await apiClient.post<AuthMessageResponse>("/auth/reset-password", data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<AuthMessageResponse> => {
    const response = await apiClient.put<AuthMessageResponse>("/users/me/password", data);
    return response.data;
  },

  verifyAccount: async (data: VerifyAccountRequest): Promise<AuthMessageResponse> => {
    const response = await apiClient.post<AuthMessageResponse>("/auth/verify-account", data);
    return response.data;
  },

  resendOtp: async (data: ResendOtpRequest): Promise<AuthMessageResponse> => {
    const response = await apiClient.post<AuthMessageResponse>("/auth/resend-otp", data);
    return response.data;
  },

  getMe: async (): Promise<UserProfileResponse> => {
    const response = await apiClient.get<UserProfileResponse>("/users/me");
    return response.data;
  },
};

export default authService;
