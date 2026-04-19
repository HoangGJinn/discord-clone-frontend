import { create } from "zustand";
import apiClient from "@/api/client";
import socketService from "@/services/socketService";
import {
  ChannelMessage,
  SendChannelMessagePayload,
  EditMessagePayload,
  ReactionPayload,
} from "@/types/channel";
import { normalizeAttachmentList } from "@/utils/attachments";
import { useAuthStore } from "@/store/useAuthStore";

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

const applyReactionAdd = (messages: ChannelMessage[], messageId: string, userId: string, emoji: string): ChannelMessage[] => {
  return messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    const reactions = Array.isArray(message.reactions) ? [...message.reactions] : [];
    const index = reactions.findIndex((item) => item.emoji === emoji);
    if (index === -1) {
      reactions.push({ emoji, count: 1, users: [userId] });
      return { ...message, reactions };
    }

    const target = reactions[index];
    const users = Array.isArray(target.users) ? target.users : [];
    if (!users.includes(userId)) {
      const nextUsers = [...users, userId];
      reactions[index] = { ...target, users: nextUsers, count: nextUsers.length };
    }

    return { ...message, reactions };
  });
};

const applyReactionRemove = (messages: ChannelMessage[], messageId: string, userId: string, emoji: string): ChannelMessage[] => {
  return messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    const reactions = Array.isArray(message.reactions) ? [...message.reactions] : [];
    const index = reactions.findIndex((item) => item.emoji === emoji);
    if (index === -1) {
      return message;
    }

    const target = reactions[index];
    const users = Array.isArray(target.users) ? target.users : [];
    const nextUsers = users.filter((id) => String(id) !== String(userId));
    if (nextUsers.length === 0) {
      reactions.splice(index, 1);
    } else {
      reactions[index] = { ...target, users: nextUsers, count: nextUsers.length };
    }

    return { ...message, reactions };
  });
};

const toTimestamp = (value: unknown): number => {
  const time = new Date(value as any).getTime();
  return Number.isFinite(time) ? time : 0;
};

const sortMessagesForInvertedList = (messages: ChannelMessage[]): ChannelMessage[] => {
  // Inverted FlatList works best with newest-first data.
  return [...messages].sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
};

// helper to adapt backend flat response to nested format
const adaptMessage = (msg: any): ChannelMessage => {
  const rawAttachments =
    msg?.attachments ?? msg?.attachmentUrls ?? msg?.files ?? msg?.fileUrls ?? [];
  const replyRaw = msg?.replyToMessage;

  return ({
  id: String(msg?.id ?? `${msg?.channelId ?? "unknown"}-${msg?.createdAt ?? Date.now()}-${msg?.senderId ?? "anon"}`),
  channelId: msg?.channelId,
  content: typeof msg?.content === "string" ? msg.content : "",
  createdAt: msg.createdAt,
  updatedAt: msg.updatedAt,
  edited: msg.edited,
  deleted: msg.deleted,
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
  attachments: normalizeAttachmentList(rawAttachments),
  replyToId: msg?.replyToId ? String(msg.replyToId) : undefined,
  replyToMessage: replyRaw
    ? {
        id: String(replyRaw.id),
        content: typeof replyRaw.content === "string" ? replyRaw.content : "",
        attachments: normalizeAttachmentList(replyRaw.attachments),
        senderName: replyRaw.senderName,
        deleted: Boolean(replyRaw.deleted),
      }
    : undefined,
  reactions: msg.reactions || [],
});
};

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
      const newMessages: ChannelMessage[] = sortMessagesForInvertedList(rawArray.map(adaptMessage));
      const isLastPage = Array.isArray(data) ? true : data.last ?? true;

      set({
        messages:
          page === 0
            ? newMessages
            : sortMessagesForInvertedList([...get().messages, ...newMessages]),
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
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) {
        return {
          messages: sortMessagesForInvertedList(
            state.messages.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
          ),
        };
      }

      return {
        messages: sortMessagesForInvertedList([message, ...state.messages]),
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
      await apiClient.post(`/messages/${messageId}/reactions`, null, {
        params: { emoji: payload.emoji },
      });

      const currentUserId = useAuthStore.getState().user?.id;
      if (currentUserId) {
        set((state) => ({
          messages: applyReactionAdd(state.messages, messageId, String(currentUserId), payload.emoji),
        }));
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  removeReaction: async (messageId: string, payload: ReactionPayload) => {
    try {
      await apiClient.delete(`/messages/${messageId}/reactions`, {
        params: { emoji: payload.emoji },
      });

      const currentUserId = useAuthStore.getState().user?.id;
      if (currentUserId) {
        set((state) => ({
          messages: applyReactionRemove(state.messages, messageId, String(currentUserId), payload.emoji),
        }));
      }
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
