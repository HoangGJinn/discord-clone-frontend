import { create } from "zustand";
import apiClient from "@/api/client";
import socketService from "@/services/socketService";
import {
  ChannelMessage,
  SendChannelMessagePayload,
  EditMessagePayload,
  ReactionPayload,
} from "@/types/channel";

interface ChannelChatState {
  messages: ChannelMessage[];
  activeChannelId: string | null;
  currentPage: number;
  hasMoreMessages: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: string | null;
}

interface ChannelChatActions {
  fetchMessages: (channelId: string, page?: number) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (channelId: string, payload: SendChannelMessagePayload) => Promise<boolean>;
  addRealtimeMessage: (message: ChannelMessage) => void;
  setActiveChannel: (channelId: string | null) => void;
  clearMessages: () => void;
  clearError: () => void;
  // ── Day 4: Message Actions ─────────────────────────────
  editMessage: (messageId: string, payload: EditMessagePayload) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  pinMessage: (messageId: string) => Promise<void>;
  unpinMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, payload: ReactionPayload) => Promise<void>;
  removeReaction: (messageId: string, payload: ReactionPayload) => Promise<void>;
  updateMessageInList: (messageId: string, updates: Partial<ChannelMessage>) => void;
  removeMessageFromList: (messageId: string) => void;
}

type ChannelChatStore = ChannelChatState & ChannelChatActions;

// helper to adapt backend flat response to nested format
const adaptMessage = (msg: any): ChannelMessage => ({
  id: msg.id,
  channelId: msg.channelId,
  content: msg.content,
  createdAt: msg.createdAt,
  updatedAt: msg.updatedAt,
  edited: msg.edited,
  pinned: msg.pinned,
  sender: {
    id: String(msg.senderId),
    username: msg.senderName || "Unknown",
    displayName: msg.senderName || "Unknown",
    avatar: msg.senderAvatar || "",
    email: "",
    status: "ONLINE",
    role: [],
    avatarEffectId: msg.senderAvatarEffectId || null,
    bannerEffectId: msg.senderBannerEffectId || null,
    cardEffectId: msg.senderCardEffectId || null,
  },
  attachments: msg.attachments || [],
  reactions: msg.reactions || [],
});

export const useChannelChatStore = create<ChannelChatStore>((set, get) => ({
  messages: [],
  activeChannelId: null,
  currentPage: 0,
  hasMoreMessages: true,
  isLoadingMessages: false,
  isSending: false,
  error: null,

  fetchMessages: async (channelId: string, page = 0) => {
    set({
      isLoadingMessages: true,
      error: null,
      activeChannelId: channelId,
    });

    try {
      const response = await apiClient.get(
        `/channels/${channelId}/messages`,
        { params: { page, size: 30 } }
      );

      const data = response.data;
      const rawArray = Array.isArray(data) ? data : data.content ?? [];
      const newMessages: ChannelMessage[] = rawArray.map(adaptMessage);
      const isLastPage = Array.isArray(data) ? true : data.last ?? true;

      set({
        messages:
          page === 0 ? newMessages : [...get().messages, ...newMessages],
        currentPage: page,
        hasMoreMessages: !isLastPage,
        isLoadingMessages: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message,
        isLoadingMessages: false,
      });
    }
  },

  loadMoreMessages: async () => {
    const {
      activeChannelId,
      hasMoreMessages,
      isLoadingMessages,
      currentPage,
    } = get();
    
    if (!activeChannelId || !hasMoreMessages || isLoadingMessages) return;

    await get().fetchMessages(activeChannelId, currentPage + 1);
  },

  sendMessage: async (channelId: string, payload: SendChannelMessagePayload) => {
    set({ isSending: true, error: null });

    try {
      // Broadcast via WebSocket
      const sent = await socketService.send(`/app/chat/${channelId}`, payload);
      set({ isSending: false });
      return sent;
    } catch (err: any) {
      set({
        error: err.message,
        isSending: false,
      });
      return false;
    }
  },

  addRealtimeMessage: (rawMessage: any) => {
    const message = adaptMessage(rawMessage);
    set((state) => {
      // Deduplicate
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) return state;

      return {
        messages: [message, ...state.messages],
      };
    });
  },

  setActiveChannel: (channelId: string | null) => {
    set({ activeChannelId: channelId });
  },

  clearMessages: () => {
    set({
      messages: [],
      activeChannelId: null,
      currentPage: 0,
      hasMoreMessages: true,
      error: null,
    });
  },

  clearError: () => set({ error: null }),

  // ── Day 4: Message Actions Implementation ──────────────

  editMessage: async (messageId: string, payload: EditMessagePayload) => {
    try {
      await apiClient.put(`/messages/${messageId}`, payload);
      get().updateMessageInList(messageId, {
        content: payload.content,
        edited: true,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      await apiClient.delete(`/messages/${messageId}`);
      get().removeMessageFromList(messageId);
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  pinMessage: async (messageId: string) => {
    try {
      await apiClient.post(`/messages/${messageId}/pin`);
      get().updateMessageInList(messageId, { pinned: true });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  unpinMessage: async (messageId: string) => {
    try {
      await apiClient.delete(`/messages/${messageId}/pin`);
      get().updateMessageInList(messageId, { pinned: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  addReaction: async (messageId: string, payload: ReactionPayload) => {
    try {
      await apiClient.post(`/messages/${messageId}/reactions`, payload);
      // Optimistic: will also arrive via WebSocket
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  removeReaction: async (messageId: string, payload: ReactionPayload) => {
    try {
      await apiClient.delete(`/messages/${messageId}/reactions`, {
        data: payload,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  updateMessageInList: (messageId: string, updates: Partial<ChannelMessage>) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    }));
  },

  removeMessageFromList: (messageId: string) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }));
  },
}));
