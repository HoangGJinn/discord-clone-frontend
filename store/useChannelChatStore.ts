import { create } from "zustand";
import apiClient from "@/api/client";
import socketService from "@/services/socketService";
import { ChannelMessage, SendChannelMessagePayload } from "@/types/channel";

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
  sendMessage: (channelId: string, payload: SendChannelMessagePayload) => void;
  addRealtimeMessage: (message: ChannelMessage) => void;
  setActiveChannel: (channelId: string | null) => void;
  clearMessages: () => void;
  clearError: () => void;
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
  sender: {
    id: String(msg.senderId),
    username: msg.senderName || "Unknown",
    displayName: msg.senderName || "Unknown",
    avatar: msg.senderAvatar || "",
    email: "",
    status: "ONLINE",
    role: [],
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

  sendMessage: (channelId: string, payload: SendChannelMessagePayload) => {
    if (!socketService.isActive()) {
      set({ error: "No connection to server." });
      return;
    }

    set({ isSending: true, error: null });

    try {
      // Broadcast via WebSocket
      socketService.send(`/app/chat/${channelId}`, payload);
      set({ isSending: false });
    } catch (err: any) {
      set({
        error: err.message,
        isSending: false,
      });
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
}));
