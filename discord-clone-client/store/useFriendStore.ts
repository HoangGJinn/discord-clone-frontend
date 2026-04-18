import { create } from "zustand";
import apiClient from "../api/client";

export type FriendshipStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
export type UserPresenceStatus = "ONLINE" | "IDLE" | "DND" | "OFFLINE" | string;

export interface FriendshipResponse {
  id: number;
  status: FriendshipStatus;
  senderId: number;
  senderUsername: string;
  senderDisplayName?: string | null;
  senderAvatarUrl?: string | null;
  senderStatus?: UserPresenceStatus | null;
  receiverId: number;
  receiverUsername: string;
  receiverDisplayName?: string | null;
  receiverAvatarUrl?: string | null;
  receiverStatus?: UserPresenceStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UserSearchResult {
  id: number;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  friendshipStatus?: FriendshipStatus | null;
  friendshipId?: number | null;
  isSender?: boolean | null;
}

interface FriendState {
  friends: FriendshipResponse[];
  receivedRequests: FriendshipResponse[];
  sentRequests: FriendshipResponse[];
  searchResults: UserSearchResult[];
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;

  fetchFriends: () => Promise<void>;
  fetchReceivedRequests: () => Promise<void>;
  fetchSentRequests: () => Promise<void>;
  searchUsers: (keyword: string) => Promise<void>;
  clearSearchResults: () => void;
  clearError: () => void;
  sendFriendRequest: (receiverId: number) => Promise<void>;
  acceptFriendRequest: (friendshipId: number) => Promise<void>;
  rejectFriendRequest: (friendshipId: number) => Promise<void>;
  cancelFriendRequest: (friendshipId: number) => Promise<void>;
  unfriend: (friendshipId: number) => Promise<void>;
}

const extractErrorMessage = (error: unknown, fallback = "Request failed"): string => {
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
  return fallback;
};

const normalizeFriendship = (raw: any): FriendshipResponse => ({
  id: Number(raw?.id ?? 0),
  status: String(raw?.status ?? "PENDING") as FriendshipStatus,
  senderId: Number(raw?.senderId ?? 0),
  senderUsername: String(raw?.senderUsername ?? ""),
  senderDisplayName: raw?.senderDisplayName ?? null,
  senderAvatarUrl: raw?.senderAvatarUrl ?? null,
  senderStatus: raw?.senderStatus ?? null,
  receiverId: Number(raw?.receiverId ?? 0),
  receiverUsername: String(raw?.receiverUsername ?? ""),
  receiverDisplayName: raw?.receiverDisplayName ?? null,
  receiverAvatarUrl: raw?.receiverAvatarUrl ?? null,
  receiverStatus: raw?.receiverStatus ?? null,
  createdAt: raw?.createdAt ?? null,
  updatedAt: raw?.updatedAt ?? null,
});

const normalizeSearchUser = (raw: any): UserSearchResult => ({
  id: Number(raw?.id ?? 0),
  username: String(raw?.username ?? ""),
  displayName: raw?.displayName ?? null,
  avatarUrl: raw?.avatarUrl ?? null,
  bio: raw?.bio ?? null,
  friendshipStatus: (raw?.friendshipStatus ?? null) as FriendshipStatus | null,
  friendshipId: raw?.friendshipId != null ? Number(raw.friendshipId) : null,
  isSender: raw?.isSender ?? null,
});

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  searchResults: [],
  isLoading: false,
  isSearching: false,
  error: null,

  clearSearchResults: () => set({ searchResults: [] }),
  clearError: () => set({ error: null }),

  fetchFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const resp = await apiClient.get<FriendshipResponse[]>("/friends");
      set({
        friends: Array.isArray(resp.data) ? resp.data.map(normalizeFriendship) : [],
        isLoading: false,
      });
    } catch (error) {
      set({ error: extractErrorMessage(error, "Failed to load friends"), isLoading: false });
    }
  },

  fetchReceivedRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const resp = await apiClient.get<FriendshipResponse[]>("/friends/requests/received");
      set({
        receivedRequests: Array.isArray(resp.data) ? resp.data.map(normalizeFriendship) : [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Failed to load pending requests"),
        isLoading: false,
      });
    }
  },

  fetchSentRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const resp = await apiClient.get<FriendshipResponse[]>("/friends/requests/sent");
      set({
        sentRequests: Array.isArray(resp.data) ? resp.data.map(normalizeFriendship) : [],
        isLoading: false,
      });
    } catch (error) {
      set({ error: extractErrorMessage(error, "Failed to load sent requests"), isLoading: false });
    }
  },

  searchUsers: async (keyword) => {
    const trimmed = keyword.trim();
    if (trimmed.length < 2) {
      set({ searchResults: [], isSearching: false, error: null });
      return;
    }

    set({ isSearching: true, error: null });
    try {
      const resp = await apiClient.get<UserSearchResult[]>("/users/search", {
        params: { keyword: trimmed },
      });
      set({
        searchResults: Array.isArray(resp.data) ? resp.data.map(normalizeSearchUser) : [],
        isSearching: false,
      });
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Failed to search users"),
        isSearching: false,
      });
    }
  },

  sendFriendRequest: async (receiverId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post(`/friends/request/${receiverId}`);
      await Promise.all([get().fetchSentRequests(), get().fetchFriends()]);
      set({ isLoading: false });
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to send friend request");
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  acceptFriendRequest: async (friendshipId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.put(`/friends/${friendshipId}/accept`);
      await Promise.all([get().fetchReceivedRequests(), get().fetchFriends()]);
      set({ isLoading: false });
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to accept friend request");
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  rejectFriendRequest: async (friendshipId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.put(`/friends/${friendshipId}/reject`);
      await get().fetchReceivedRequests();
      set({ isLoading: false });
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to reject friend request");
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  cancelFriendRequest: async (friendshipId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/friends/request/${friendshipId}`);
      await get().fetchSentRequests();
      set({ isLoading: false });
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to cancel friend request");
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  unfriend: async (friendshipId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/friends/${friendshipId}`);
      await get().fetchFriends();
      set({ isLoading: false });
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to unfriend");
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },
}));
