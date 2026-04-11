import { User } from "@/store/useAuthStore";

// ─── Conversation ────────────────────────────────────────────
export interface Conversation {
  id: string;
  participantOne: User;
  participantTwo: User;
  lastMessage?: DirectMessage;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Direct Message ──────────────────────────────────────────
export interface DirectMessage {
  id: string;
  conversationId: string;
  sender: User;
  content: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
  edited?: boolean;
  pinned?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ─── Attachment ──────────────────────────────────────────────
export interface Attachment {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size?: number;
}

// ─── Reaction ────────────────────────────────────────────────
export interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // user IDs
}

// ─── Send Message Payload ────────────────────────────────────
export interface SendDirectMessagePayload {
  conversationId: string;
  content: string;
}

// ─── Paginated Response ──────────────────────────────────────
export interface PaginatedMessages {
  content: DirectMessage[];
  totalPages: number;
  totalElements: number;
  number: number; // current page
  last: boolean;
}

// ─── Helper: Extract the other participant from conversation ─
export function getOtherParticipant(
  conversation: Conversation,
  currentUserId: string,
): User {
  return conversation.participantOne.id === currentUserId
    ? conversation.participantTwo
    : conversation.participantOne;
}
