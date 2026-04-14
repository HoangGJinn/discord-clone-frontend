import { create } from "zustand";
import apiClient from "../api/client";
import { User } from "./useAuthStore";

export interface Friendship {
  id: string;
  user: User;
  friend: User;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
  createdAt: string;
}

interface FriendState {
  friends: User[];
  receivedRequests: Friendship[];
  sentRequests: Friendship[];
  isLoading: boolean;
  error: string | null;

  fetchFriends: () => Promise<void>;
  fetchReceivedRequests: () => Promise<void>;
  fetchSentRequests: () => Promise<void>;
  sendFriendRequest: (receiverId: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  rejectFriendRequest: (friendshipId: string) => Promise<void>;
  cancelFriendRequest: (friendshipId: string) => Promise<void>;
  unfriend: (friendshipId: string) => Promise<void>;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  isLoading: false,
  error: null,

  fetchFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const resp = await apiClient.get("/friends");
      set({ friends: resp.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchReceivedRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const resp = await apiClient.get("/friends/requests/received");
      set({ receivedRequests: resp.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchSentRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const resp = await apiClient.get("/friends/requests/sent");
      set({ sentRequests: resp.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  sendFriendRequest: async (receiverId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post(`/friends/request/${receiverId}`);
      await get().fetchSentRequests();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  acceptFriendRequest: async (friendshipId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.put(`/friends/${friendshipId}/accept`);
      await Promise.all([get().fetchReceivedRequests(), get().fetchFriends()]);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  rejectFriendRequest: async (friendshipId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.put(`/friends/${friendshipId}/reject`);
      await get().fetchReceivedRequests();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  cancelFriendRequest: async (friendshipId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/friends/request/${friendshipId}`);
      await get().fetchSentRequests();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  unfriend: async (friendshipId) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/friends/${friendshipId}`);
      await get().fetchFriends();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
