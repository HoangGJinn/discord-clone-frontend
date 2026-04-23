// ─── Search Result Types ─────────────────────────────────────

export interface SearchServer {
  id: string;
  name: string;
  icon?: string;
  memberCount?: number;
  description?: string;
}

export interface SearchChannel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId: string;
  serverName?: string;
}

export interface SearchMember {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  avatarUrl?: string; // from backend mapper
  status?: string;
  avatarEffectId?: string;
  bannerEffectId?: string;
  cardEffectId?: string;
}

// ─── Combined Search Response ────────────────────────────────
export interface SearchResults {
  servers: SearchServer[];
  channels: SearchChannel[];
  members: SearchMember[];
  friends: SearchMember[];
}

// ─── Search Type Filter ──────────────────────────────────────
export type SearchType = 'all' | 'servers' | 'channels' | 'members' | 'friends';
