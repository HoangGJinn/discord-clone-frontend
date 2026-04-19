import apiClient from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Conversation,
  DirectMessage,
  SendDirectMessagePayload,
} from "@/types/dm";
import {
  transformConversation,
  transformConversationArray,
  transformDirectMessage,
  transformMessageArray,
  BackendConversationResponse,
  BackendDirectMessageResponse,
} from "@/utils/dmTransformers";
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

const applyReactionAdd = (messages: DirectMessage[], messageId: string, userId: string, emoji: string): DirectMessage[] => {
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

const applyReactionRemove = (messages: DirectMessage[], messageId: string, userId: string, emoji: string): DirectMessage[] => {
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

const normalizeFrontendMessage = (message: DirectMessage): DirectMessage => {
  const rawSender = (message.sender ?? {}) as any;

  return {
    ...message,
    id: String(message.id),
    conversationId: String(message.conversationId),
    sender: {
      id: String(rawSender.id ?? ''),
      username: rawSender.username || 'Unknown',
      email: rawSender.email || '',
      avatar: rawSender.avatar || rawSender.avatarUrl || undefined,
      displayName: rawSender.displayName || undefined,
      status: rawSender.status || undefined,
      role: Array.isArray(rawSender.role)
        ? rawSender.role
        : Array.isArray(rawSender.roles)
          ? rawSender.roles
          : [],
      bio: rawSender.bio || undefined,
      birthDate: rawSender.birthDate || undefined,
      country: rawSender.country || undefined,
      pronouns: rawSender.pronouns || undefined,
      avatarEffectId: rawSender.avatarEffectId || undefined,
      bannerEffectId: rawSender.bannerEffectId || undefined,
      cardEffectId: rawSender.cardEffectId || undefined,
    },
    createdAt: String(message.createdAt),
    updatedAt: message.updatedAt ? String(message.updatedAt) : undefined,
  };
};

const enrichSenderFromConversation = (
  message: DirectMessage,
  conversations: Conversation[],
): DirectMessage => {
  const conversation = conversations.find((c) => c.id === message.conversationId);
  if (!conversation) {
    return message;
  }

  const senderId = String(message.sender.id || '');
  const participantOneId = String(conversation.participantOne?.id || '');
  const participantTwoId = String(conversation.participantTwo?.id || '');

  const participant = senderId === participantOneId
    ? conversation.participantOne
    : senderId === participantTwoId
      ? conversation.participantTwo
      : null;

  if (!participant) {
    return message;
  }

  return {
    ...message,
    sender: {
      ...message.sender,
      username: message.sender.username && message.sender.username !== 'Unknown'
        ? message.sender.username
        : participant.username,
      displayName: message.sender.displayName || participant.displayName,
      avatar: message.sender.avatar || participant.avatar,
      status: message.sender.status || participant.status,
    },
  };
};

const normalizeIncomingMessage = (
  message: DirectMessage | BackendDirectMessageResponse,
  conversations: Conversation[],
): DirectMessage => {
  const raw = message as any;
  const looksLikeBackend =
    typeof raw?.senderId === 'number' ||
    typeof raw?.receiverId === 'number' ||
    Boolean(raw?.sender?.avatarUrl);

  const normalized = looksLikeBackend
    ? transformDirectMessage(message as BackendDirectMessageResponse)
    : normalizeFrontendMessage(message as DirectMessage);

  return enrichSenderFromConversation(normalized, conversations);
};

const dedupeMessagesById = (messages: DirectMessage[]): DirectMessage[] => {
  const seen = new Set<string>();
  const result: DirectMessage[] = [];

  for (const message of messages) {
    const key = String(message.id);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(message);
  }

  return result;
};

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
      const conversations = transformConversationArray(
        response.data as BackendConversationResponse[]
      );
      set({ conversations, isLoadingConversations: false });
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
      const conversation = transformConversation(
        response.data as BackendConversationResponse
      );

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
      let newMessages: DirectMessage[];

      if (Array.isArray(data)) {
        newMessages = transformMessageArray(data as BackendDirectMessageResponse[]);
      } else if (data.content) {
        newMessages = transformMessageArray(data.content as BackendDirectMessageResponse[]);
      } else {
        newMessages = [];
      }

      const isLastPage = Array.isArray(data) ? true : (data.last ?? true);

      const mergedMessages =
        page === 0 ? newMessages : [...get().messages, ...newMessages];

      set({
        messages: dedupeMessagesById(mergedMessages),
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
      // Get conversation to find receiverId
      const state = get();
      const conversation = state.conversations.find(
        (c) => c.id === payload.conversationId
      );

      let receiverId: string;
      if (conversation) {
        // Determine the receiver from conversation participants
        const currentUserId = useAuthStore.getState().user?.id;
        receiverId =
          String(conversation.participantOne.id) === String(currentUserId)
            ? String(conversation.participantTwo.id)
            : String(conversation.participantOne.id);
      } else {
        // Fallback: fetch conversation details
        try {
          const convResponse = await apiClient.get(
            `/direct-messages/conversation/${payload.conversationId}`
          );
          const convData = convResponse.data as BackendConversationResponse;
          // If we can't get receiver, we'll try without it
          receiverId = String(convData.user1Id);
        } catch {
          receiverId = "";
        }
      }

      // Send message with receiverId as required by backend
      const sendPayload: any = {
        conversationId: payload.conversationId,
        content: payload.content,
        attachments: payload.attachments,
        replyToId: payload.replyToId,
        ...(receiverId ? { receiverId: parseInt(receiverId, 10) } : {}),
      };

      const response = await apiClient.post("/direct-messages", sendPayload);
      const sentMessage = transformDirectMessage(
        response.data as BackendDirectMessageResponse
      );

      // Prepend to messages (newest first in inverted list)
      set((state) => ({
        messages: dedupeMessagesById([sentMessage, ...state.messages]),
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

  addRealtimeMessage: (message: DirectMessage | BackendDirectMessageResponse) => {
    const transformedMessage = normalizeIncomingMessage(message, get().conversations);

    set((state) => {
      const exists = state.messages.some(
        (m) => String(m.id) === String(transformedMessage.id),
      );

      if (exists) {
        return {
          messages: state.messages.map((m) =>
            String(m.id) === String(transformedMessage.id) ? transformedMessage : m,
          ),
        };
      }

      return {
        messages: dedupeMessagesById([transformedMessage, ...state.messages]),
      };
    });

    // Always update conversation preview for real-time messages
    get().updateConversationPreview(transformedMessage.conversationId, transformedMessage);
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
      await apiClient.post(`/direct-messages/${messageId}/reactions`, null, {
        params: { emoji },
      });

      const currentUserId = useAuthStore.getState().user?.id;
      if (currentUserId) {
        set((state) => ({
          messages: applyReactionAdd(state.messages, messageId, String(currentUserId), emoji),
        }));
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message });
    }
  },

  removeReaction: async (messageId: string, emoji: string) => {
    try {
      await apiClient.delete(`/direct-messages/${messageId}/reactions`, {
        params: { emoji },
      });

      const currentUserId = useAuthStore.getState().user?.id;
      if (currentUserId) {
        set((state) => ({
          messages: applyReactionRemove(state.messages, messageId, String(currentUserId), emoji),
        }));
      }
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
