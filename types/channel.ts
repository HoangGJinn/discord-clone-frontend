import { User } from "@/store/useAuthStore";
import { Attachment, Reaction } from "./dm";
export interface ChannelMessage {
  id: string;
  channelId: number | string;
  sender: User;
  content: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
  edited?: boolean;
  createdAt: string;
  updatedAt?: string;
  replyToId?: string;
}

// ─── Send Message Payload ────────────────────────────────────
export interface SendChannelMessagePayload {
  content: string;
  replyToId?: string;
  attachments?: string[];
}

// ─── Paginated Response ──────────────────────────────────────
export interface PaginatedChannelMessages {
  content: ChannelMessage[];
  totalPages: number;
  totalElements: number;
  number: number;
  last: boolean;
}
