import { create } from 'zustand';
import {
  createServer,
  CreateServerInput,
  getMyServers,
  joinServer,
  ServerResponse,
} from '@/services/serverService';

interface ServerState {
  servers: ServerResponse[];
  channelUnreadByServer: Record<number, Record<number, number>>;
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
  setChannelUnreadMap: (serverId: number, unreadByChannel: Record<number, number>) => void;
  incrementChannelUnread: (serverId: number, channelId: number) => void;
  clearChannelUnread: (serverId: number, channelId: number) => void;
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
  channelUnreadByServer: {},
  activeServerId: null,
  isLoadingServers: false,
  isCreatingServer: false,
  isJoiningServer: false,
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

  joinServerByCode: async (inviteCode: string) => {
    set({ isJoiningServer: true, error: null });
    try {
      const joinedServer = await joinServer(inviteCode);
      set((state) => ({
        servers: [joinedServer, ...state.servers.filter((s) => s.id !== joinedServer.id)],
        activeServerId: joinedServer.id,
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

  setChannelUnreadMap: (serverId, unreadByChannel) =>
    set((state) => {
      const totalUnread = Object.values(unreadByChannel).reduce(
        (acc, value) => acc + Math.max(0, Number(value) || 0),
        0,
      );
      return {
        channelUnreadByServer: {
          ...state.channelUnreadByServer,
          [serverId]: unreadByChannel,
        },
        servers: state.servers.map((server) =>
          server.id === serverId
            ? { ...server, unreadCount: totalUnread }
            : server,
        ),
      };
    }),

  incrementChannelUnread: (serverId, channelId) =>
    set((state) => {
      const currentServerMap = state.channelUnreadByServer[serverId] || {};
      const serverUnread = state.servers.find((server) => server.id === serverId)?.unreadCount ?? 0;
      const hasChannelMap = Object.keys(currentServerMap).length > 0;
      const baseChannelUnread = hasChannelMap
        ? (currentServerMap[channelId] || 0)
        : Math.max(0, Number(serverUnread) || 0);
      const nextServerMap = {
        ...currentServerMap,
        [channelId]: baseChannelUnread + 1,
      };
      const totalUnread = hasChannelMap
        ? Object.values(nextServerMap).reduce((acc, value) => acc + (value || 0), 0)
        : (Math.max(0, Number(serverUnread) || 0) + 1);
      return {
        channelUnreadByServer: {
          ...state.channelUnreadByServer,
          [serverId]: nextServerMap,
        },
        servers: state.servers.map((server) =>
          server.id === serverId
            ? { ...server, unreadCount: totalUnread }
            : server,
        ),
      };
    }),

  clearChannelUnread: (serverId, channelId) =>
    set((state) => {
      const currentServerMap = state.channelUnreadByServer[serverId] || {};
      if ((currentServerMap[channelId] || 0) <= 0) {
        return {};
      }
      const nextServerMap = {
        ...currentServerMap,
        [channelId]: 0,
      };
      const totalUnread = Object.values(nextServerMap).reduce((acc, value) => acc + (value || 0), 0);
      return {
        channelUnreadByServer: {
          ...state.channelUnreadByServer,
          [serverId]: nextServerMap,
        },
        servers: state.servers.map((server) =>
          server.id === serverId
            ? { ...server, unreadCount: totalUnread }
            : server,
        ),
      };
    }),

  clearError: () => set({ error: null }),
}));

