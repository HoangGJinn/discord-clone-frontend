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
  username: string;
  displayName?: string;
  avatar?: string;
  status?: string;
}

// ─── Combined Search Response ────────────────────────────────
export interface SearchResults {
  servers: SearchServer[];
  channels: SearchChannel[];
  members: SearchMember[];
}

// ─── Search Type Filter ──────────────────────────────────────
export type SearchType = 'all' | 'servers' | 'channels' | 'members';
