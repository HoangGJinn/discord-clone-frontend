import { create } from 'zustand';
import {
  createServer,
  CreateServerInput,
  getMyServers,
  joinServer,
  ServerResponse,
} from '@/services/serverService';

// ── Types ───────────────────────────────────────────────────────────────────

interface ServerState {
  servers: ServerResponse[];
  activeServerId: number | null;
  isLoadingServers: boolean;
  isCreatingServer: boolean;
  isJoiningServer: boolean;
  error: string | null;
}

interface ServerActions {
  fetchServers: () => Promise<void>;
  createNewServer: (payload: CreateServerInput) => Promise<ServerResponse | null>;
  joinServerByCode: (inviteCode: string) => Promise<ServerResponse | null>;
  setActiveServerId: (serverId: number | null) => void;
  clearError: () => void;
}

type ServerStore = ServerState & ServerActions;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extracts a human-readable error message from an unknown error object. */
const normalizeError = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    if (maybeError.response?.data?.message) {
      return String(maybeError.response.data.message);
    }
    if (maybeError.message) {
      return String(maybeError.message);
    }
  }
  return fallback;
};

/**
 * Adds a server to the list (or replaces it if it already exists)
 * and sets it as the active server.
 */
const addServerToList = (
  currentServers: ServerResponse[],
  newServer: ServerResponse,
): { servers: ServerResponse[]; activeServerId: number } => ({
  servers: [newServer, ...currentServers.filter((s) => s.id !== newServer.id)],
  activeServerId: newServer.id,
});

// ── Store ───────────────────────────────────────────────────────────────────

export const useServerStore = create<ServerStore>((set, get) => ({
  // State
  servers: [],
  activeServerId: null,
  isLoadingServers: false,
  isCreatingServer: false,
  isJoiningServer: false,
  error: null,

  // Actions
  fetchServers: async () => {
    set({ isLoadingServers: true, error: null });
    try {
      const servers = await getMyServers();
      const currentActiveId = get().activeServerId;
      const stillExists = servers.some((server) => server.id === currentActiveId);

      set({
        servers,
        activeServerId:
          stillExists ? currentActiveId : (servers.length > 0 ? servers[0].id : null),
        isLoadingServers: false,
      });
    } catch (error) {
      set({
        isLoadingServers: false,
        error: normalizeError(error, 'Failed to load servers.'),
      });
    }
  },

  createNewServer: async (payload) => {
    set({ isCreatingServer: true, error: null });
    try {
      const createdServer = await createServer(payload);
      set((state) => ({
        ...addServerToList(state.servers, createdServer),
        isCreatingServer: false,
      }));
      return createdServer;
    } catch (error) {
      set({
        isCreatingServer: false,
        error: normalizeError(error, 'Failed to create server.'),
      });
      return null;
    }
  },

  joinServerByCode: async (inviteCode: string) => {
    set({ isJoiningServer: true, error: null });
    try {
      const joinedServer = await joinServer(inviteCode);
      set((state) => ({
        ...addServerToList(state.servers, joinedServer),
        isJoiningServer: false,
      }));
      return joinedServer;
    } catch (error) {
      set({
        isJoiningServer: false,
        error: normalizeError(error, 'Failed to join server. Check the invite code.'),
      });
      return null;
    }
  },

  setActiveServerId: (serverId) => set({ activeServerId: serverId }),

  clearError: () => set({ error: null }),
}));
