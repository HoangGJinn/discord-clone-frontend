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
  if (!conversation) {
    return { id: '', username: 'Unknown', email: '', role: [] };
  }

  const p1 = conversation.participantOne;
  const p2 = conversation.participantTwo;

  // Fallback if one of the participants is missing from the object
  if (!p1 || !p2) {
    if (p1 && String(p1.id) !== String(currentUserId)) return p1;
    if (p2 && String(p2.id) !== String(currentUserId)) return p2;
    return p1 || p2 || { id: '', username: 'Deleted User', email: '', role: [] };
  }

  return String(p1.id) === String(currentUserId) ? p2 : p1;
}
