import { create } from 'zustand';
import apiClient from '@/api/client';

export interface ProfileEffect {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  animationUrl?: string;
  price: number;
  type: 'AVATAR' | 'BANNER' | 'CARD';
  isActive: boolean;
}

interface EffectState {
  effects: ProfileEffect[];
  isLoading: boolean;
  error: string | null;
  fetchEffects: () => Promise<void>;
  getEffectsByType: (type: 'AVATAR' | 'BANNER' | 'CARD') => ProfileEffect[];
  getEffectById: (id: string | number | null | undefined) => ProfileEffect | null;
}

export const useEffectStore = create<EffectState>((set, get) => ({
  effects: [],
  isLoading: false,
  error: null,

  fetchEffects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/effects');
      set({ effects: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  getEffectsByType: (type) => {
    return get().effects.filter((e) => e.type === type);
  },

  getEffectById: (id) => {
    if (!id) return null;
    return get().effects.find((e) => String(e.id) === String(id)) || null;
  },
}));
