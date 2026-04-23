import { create } from "zustand";
import apiClient from "@/api/client";
import {
  SearchResults,
  SearchServer,
  SearchChannel,
  SearchMember,
  SearchType,
} from "@/types/search";

// ─── State & Actions ─────────────────────────────────────────
interface SearchState {
  query: string;
  searchType: SearchType;
  results: SearchResults;
  isSearching: boolean;
  error: string | null;
}

interface SearchActions {
  setQuery: (query: string) => void;
  setSearchType: (type: SearchType) => void;
  search: (query: string) => Promise<void>;
  searchServers: (query: string) => Promise<void>;
  searchChannels: (query: string) => Promise<void>;
  searchMembers: (query: string) => Promise<void>;
  searchFriends: (query: string) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

type SearchStore = SearchState & SearchActions;

const emptyResults: SearchResults = {
  servers: [],
  channels: [],
  members: [],
  friends: [],
};

export const useSearchStore = create<SearchStore>((set, get) => ({
  query: "",
  searchType: "all",
  results: { ...emptyResults },
  isSearching: false,
  error: null,

  setQuery: (query: string) => set({ query }),

  setSearchType: (type: SearchType) => {
    set({ searchType: type });
    const { query } = get();
    if (query.trim()) {
      get().search(query);
    }
  },

  search: async (query: string) => {
    if (!query.trim()) {
      set({ results: { ...emptyResults } });
      return;
    }

    const { searchType } = get();
    set({ isSearching: true, error: null, query });

    try {
      if (searchType === "all") {
        // Fetch all categories in parallel
        const [servers, channels, members, friends] = await Promise.allSettled([
          apiClient
            .get("/search/servers", { params: { keyword: query } })
            .then((r) => r.data),
          apiClient
            .get("/search/channels", { params: { keyword: query } })
            .then((r) => r.data),
          apiClient
            .get("/search/members", { params: { keyword: query } })
            .then((r) => r.data),
          apiClient
            .get("/friends/search", { params: { keyword: query } })
            .then((r) => r.data),
        ]);

        set({
          results: {
            servers:
              servers.status === "fulfilled" ? servers.value : [],
            channels:
              channels.status === "fulfilled" ? channels.value : [],
            members:
              members.status === "fulfilled" ? members.value : [],
            friends:
              friends.status === "fulfilled" ? friends.value : [],
          },
          isSearching: false,
        });
      } else if (searchType === "servers") {
        await get().searchServers(query);
      } else if (searchType === "channels") {
        await get().searchChannels(query);
      } else if (searchType === "members") {
        await get().searchMembers(query);
      } else if (searchType === "friends") {
        await get().searchFriends(query);
      }
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message,
        isSearching: false,
      });
    }
  },

  searchServers: async (query: string) => {
    set({ isSearching: true, error: null });
    try {
      const response = await apiClient.get("/search/servers", {
        params: { keyword: query },
      });
      set((state) => ({
        results: { ...state.results, servers: response.data || [] },
        isSearching: false,
      }));
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message,
        isSearching: false,
      });
    }
  },

  searchChannels: async (query: string) => {
    set({ isSearching: true, error: null });
    try {
      const response = await apiClient.get("/search/channels", {
        params: { keyword: query },
      });
      set((state) => ({
        results: { ...state.results, channels: response.data || [] },
        isSearching: false,
      }));
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message,
        isSearching: false,
      });
    }
  },

  searchMembers: async (query: string) => {
    set({ isSearching: true, error: null });
    try {
      const response = await apiClient.get("/search/members", {
        params: { keyword: query },
      });
      set((state) => ({
        results: { ...state.results, members: response.data || [] },
        isSearching: false,
      }));
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message,
        isSearching: false,
      });
    }
  },

  searchFriends: async (query: string) => {
    set({ isSearching: true, error: null });
    try {
      const response = await apiClient.get("/friends/search", {
        params: { keyword: query },
      });
      set((state) => ({
        results: { ...state.results, friends: response.data || [] },
        isSearching: false,
      }));
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message,
        isSearching: false,
      });
    }
  },

  clearResults: () =>
    set({ results: { ...emptyResults }, query: "", error: null }),

  clearError: () => set({ error: null }),
}));
