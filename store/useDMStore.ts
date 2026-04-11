import apiClient from "@/api/client";
import {
  Conversation,
  DirectMessage,
  SendDirectMessagePayload,
} from "@/types/dm";
import { create } from "zustand";

// ─── State & Actions Interfaces ───────────────────────────────
interface DMState {
  conversations: Conversation[];
  messages: DirectMessage[];
  activeConversationId: string | null;
  currentPage: number;
  hasMoreMessages: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: string | null;
}

interface DMActions {
  fetchConversations: () => Promise<void>;
  getOrCreateConversation: (friendId: string) => Promise<string | null>;
  fetchMessages: (conversationId: string, page?: number) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (payload: SendDirectMessagePayload) => Promise<void>;
  addRealtimeMessage: (message: DirectMessage) => void;
  updateConversationPreview: (
    conversationId: string,
    message: DirectMessage,
  ) => void;
  setActiveConversation: (conversationId: string | null) => void;
  clearMessages: () => void;
  clearError: () => void;
  // ── Day 4: Message Actions ─────────────────────────────
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  updateMessageInList: (messageId: string, updates: Partial<DirectMessage>) => void;
  removeMessageFromList: (messageId: string) => void;
}

type DMStore = DMState & DMActions;
export const useDMStore = create<DMStore>((set, get) => ({
  // Initial state
  conversations: [],
  messages: [],
  activeConversationId: null,
  currentPage: 0,
  hasMoreMessages: true,
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  error: null,

  // ── Conversation Actions ─────────────────────────────────

  fetchConversations: async () => {
    set({ isLoadingConversations: true, error: null });

    try {
      const response = await apiClient.get("/direct-messages/conversations");
      set({ conversations: response.data, isLoadingConversations: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message,
        isLoadingConversations: false,
      });
    }
  },

  getOrCreateConversation: async (friendId: string) => {
    set({ error: null });

    try {
      const response = await apiClient.get(
        `/direct-messages/conversation/by-user/${friendId}`,
      );
      const conversation: Conversation = response.data;

      // Upsert into conversations list
      set((state) => {
        const exists = state.conversations.some(
          (c) => c.id === conversation.id,
        );
        return {
          conversations: exists
            ? state.conversations
            : [conversation, ...state.conversations],
        };
      });

      return conversation.id;
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
      return null;
    }
  },

  // ── Message Actions ──────────────────────────────────────

  fetchMessages: async (conversationId: string, page = 0) => {
    set({
      isLoadingMessages: true,
      error: null,
      activeConversationId: conversationId,
    });

    try {
      const response = await apiClient.get(
        `/direct-messages/conversation/${conversationId}`,
        { params: { page, size: 30 } },
      );

      const data = response.data;
      // Handle both paginated and array responses
      const newMessages: DirectMessage[] = Array.isArray(data)
        ? data
        : (data.content ?? []);
      const isLastPage = Array.isArray(data) ? true : (data.last ?? true);

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
      activeConversationId,
      hasMoreMessages,
      isLoadingMessages,
      currentPage,
    } = get();
    if (!activeConversationId || !hasMoreMessages || isLoadingMessages) return;

    await get().fetchMessages(activeConversationId, currentPage + 1);
  },

  sendMessage: async (payload: SendDirectMessagePayload) => {
    set({ isSending: true, error: null });

    try {
      const response = await apiClient.post("/direct-messages", payload);
      const sentMessage: DirectMessage = response.data;

      // Prepend to messages (newest first in inverted list)
      set((state) => ({
        messages: [sentMessage, ...state.messages],
        isSending: false,
      }));

      // Update conversation preview
      get().updateConversationPreview(payload.conversationId, sentMessage);
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message,
        isSending: false,
      });
    }
  },

  // ── Real-time Actions ────────────────────────────────────

  addRealtimeMessage: (message: DirectMessage) => {
    set((state) => {
      // Deduplicate: skip if message already exists
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) return state;

      return {
        messages: [message, ...state.messages],
      };
    });

    // Always update conversation preview for real-time messages
    get().updateConversationPreview(message.conversationId, message);
  },

  updateConversationPreview: (
    conversationId: string,
    message: DirectMessage,
  ) => {
    set((state) => {
      const updated = state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, lastMessage: message, updatedAt: message.createdAt }
          : conv,
      );

      // Sort: most recent conversation first
      updated.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      return { conversations: updated };
    });
  },

  // ── Lifecycle ────────────────────────────────────────────

  setActiveConversation: (conversationId: string | null) => {
    set({ activeConversationId: conversationId });
  },

  clearMessages: () => {
    set({
      messages: [],
      activeConversationId: null,
      currentPage: 0,
      hasMoreMessages: true,
    });
  },

  clearError: () => set({ error: null }),

  // ── Day 4: Message Actions Implementation ──────────────

  editMessage: async (messageId: string, content: string) => {
    try {
      await apiClient.put(`/direct-messages/${messageId}`, { content });
      get().updateMessageInList(messageId, { content, edited: true });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      await apiClient.delete(`/direct-messages/${messageId}`);
      get().removeMessageFromList(messageId);
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  addReaction: async (messageId: string, emoji: string) => {
    try {
      await apiClient.post(`/direct-messages/${messageId}/reactions`, { emoji });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  removeReaction: async (messageId: string, emoji: string) => {
    try {
      await apiClient.delete(`/direct-messages/${messageId}/reactions`, {
        data: { emoji },
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  updateMessageInList: (messageId: string, updates: Partial<DirectMessage>) => {
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
