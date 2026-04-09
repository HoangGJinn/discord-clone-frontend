import apiClient from "@/api/client";
import {
  Conversation,
  DirectMessage,
  SendDirectMessagePayload,
} from "@/types/dm";
import { create } from "zustand";

// ─── State Interface ─────────────────────────────────────────
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

// ─── Actions Interface (Interface Segregation) ───────────────
interface DMActions {
  // Conversation actions
  fetchConversations: () => Promise<void>;
  getOrCreateConversation: (friendId: string) => Promise<string | null>;

  // Message actions
  fetchMessages: (conversationId: string, page?: number) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (payload: SendDirectMessagePayload) => Promise<void>;

  // Real-time actions
  addRealtimeMessage: (message: DirectMessage) => void;
  updateConversationPreview: (
    conversationId: string,
    message: DirectMessage,
  ) => void;

  // Lifecycle
  setActiveConversation: (conversationId: string | null) => void;
  clearMessages: () => void;
  clearError: () => void;
}

type DMStore = DMState & DMActions;

// ─── Store Implementation ────────────────────────────────────
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
}));
