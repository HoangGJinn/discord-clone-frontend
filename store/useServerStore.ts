import { create } from 'zustand';
import {
  createServer,
  CreateServerInput,
  getMyServers,
  ServerResponse,
} from '@/services/serverService';

interface ServerState {
  servers: ServerResponse[];
  activeServerId: number | null;
  isLoadingServers: boolean;
  isCreatingServer: boolean;
  error: string | null;
}

interface ServerActions {
  fetchServers: () => Promise<void>;
  createNewServer: (payload: CreateServerInput) => Promise<ServerResponse | null>;
  setActiveServerId: (serverId: number | null) => void;
  clearError: () => void;
}

type ServerStore = ServerState & ServerActions;

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

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  activeServerId: null,
  isLoadingServers: false,
  isCreatingServer: false,
  error: null,

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
        servers: [createdServer, ...state.servers.filter((s) => s.id !== createdServer.id)],
        activeServerId: createdServer.id,
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

  setActiveServerId: (serverId) => set({ activeServerId: serverId }),

  clearError: () => set({ error: null }),
}));

