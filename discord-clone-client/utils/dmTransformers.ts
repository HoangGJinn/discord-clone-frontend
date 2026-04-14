import { User } from "@/store/useAuthStore";
import { DirectMessage, Conversation, Reaction } from "@/types/dm";

// Backend UserResponse structure
interface BackendUserResponse {
  id: number;
  username: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  birthDate?: string;
  country?: string;
  pronouns?: string;
  status?: string;
  roles?: string[];
}

// Backend DirectMessageResponse structure
interface BackendDirectMessageResponse {
  id: string;
  conversationId: string;
  senderId: number;
  receiverId: number;
  sender?: BackendUserResponse;
  receiver?: BackendUserResponse;
  content: string;
  attachments?: any[];
  reactions?: Record<string, number[]>; // emoji -> userIds array
  edited?: boolean;
  deleted?: boolean;
  isRead?: boolean;
  replyToId?: string;
  replyToMessage?: BackendDirectMessageResponse;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

// Backend ConversationResponse structure
interface BackendConversationResponse {
  id: string;
  participantOne?: BackendUserResponse;
  participantTwo?: BackendUserResponse;
  lastMessage?: BackendDirectMessageResponse;
  user1Id?: number;
  user2Id?: number;
  otherUserId?: number;
  otherUserName?: string;
  otherUserAvatar?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

// Transform backend UserResponse to frontend User
export function transformUser(backendUser?: BackendUserResponse | null): User | null {
  if (!backendUser) return null;

  return {
    id: String(backendUser.id),
    username: backendUser.username || "",
    email: backendUser.email || "",
    avatar: backendUser.avatarUrl,
    displayName: backendUser.displayName,
    status: backendUser.status,
    role: Array.isArray(backendUser.roles) ? backendUser.roles : [],
    bio: backendUser.bio,
    birthDate: backendUser.birthDate,
    country: backendUser.country,
    pronouns: backendUser.pronouns,
  };
}

// Transform backend reactions Map to frontend Reaction[]
export function transformReactions(
  reactionsMap?: Record<string, number[]>
): Reaction[] {
  if (!reactionsMap) return [];

  return Object.entries(reactionsMap).map(([emoji, userIds]) => ({
    emoji,
    count: userIds?.length || 0,
    users: userIds?.map(String) || [],
  }));
}

// Transform backend DirectMessageResponse to frontend DirectMessage
export function transformDirectMessage(
  msg: BackendDirectMessageResponse,
  currentUserId?: string
): DirectMessage {
  const sender = transformUser(msg.sender);
  const reactions = transformReactions(msg.reactions);

  return {
    id: msg.id,
    conversationId: msg.conversationId,
    sender: sender || {
      id: String(msg.senderId),
      username: "Unknown",
      email: "",
      role: [],
    },
    content: msg.content,
    attachments: msg.attachments,
    reactions: reactions,
    edited: msg.edited,
    pinned: false,
    createdAt:
      typeof msg.createdAt === "string"
        ? msg.createdAt
        : msg.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt:
      msg.updatedAt && typeof msg.updatedAt === "string"
        ? msg.updatedAt
        : msg.updatedAt?.toISOString(),
  };
}

// Transform backend ConversationResponse to frontend Conversation
export function transformConversation(
  conv: BackendConversationResponse,
  currentUserId?: string
): Conversation {
  return {
    id: conv.id,
    participantOne: transformUser(conv.participantOne) || {
      id: String(conv.user1Id),
      username: "Unknown",
      email: "",
      role: [],
    },
    participantTwo: transformUser(conv.participantTwo) || {
      id: String(conv.user2Id),
      username: "Unknown",
      email: "",
      role: [],
    },
    lastMessage: conv.lastMessage
      ? transformDirectMessage(conv.lastMessage, currentUserId)
      : undefined,
    createdAt:
      typeof conv.createdAt === "string"
        ? conv.createdAt
        : conv.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt:
      conv.updatedAt && typeof conv.updatedAt === "string"
        ? conv.updatedAt
        : conv.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

// Transform array of backend messages to frontend messages
export function transformMessageArray(
  messages: BackendDirectMessageResponse[],
  currentUserId?: string
): DirectMessage[] {
  return messages.map((msg) => transformDirectMessage(msg, currentUserId));
}

// Transform array of backend conversations to frontend conversations
export function transformConversationArray(
  conversations: BackendConversationResponse[],
  currentUserId?: string
): Conversation[] {
  return conversations.map((conv) =>
    transformConversation(conv, currentUserId)
  );
}
