import { create } from 'zustand';
import { VoiceState } from '@/services/voiceService';

interface VoiceStore {
  // Participant management
  participants: VoiceState[];
  addParticipant: (state: VoiceState) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (state: VoiceState) => void;
  setParticipants: (states: VoiceState[]) => void;
  clearParticipants: () => void;

  // Speaking indicator
  speakingUsers: Set<string>;
  setSpeakingUsers: (users: Set<string>) => void;

  // Camera users
  cameraUsers: Set<string>;
  addCameraUser: (userId: string) => void;
  removeCameraUser: (userId: string) => void;
  clearCameraUsers: () => void;

  // Connection state
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  // Participants
  participants: [],
  addParticipant: (state: VoiceState) =>
    set((store) => {
      const normalizedUserId = String(state.userId);
      const normalizedState: VoiceState = { ...state, userId: normalizedUserId };
      const exists = store.participants.find((p) => String(p.userId) === normalizedUserId);
      return { participants: exists ? store.participants : [...store.participants, normalizedState] };
    }),
  removeParticipant: (userId: string) =>
    set((store) => ({
      participants: store.participants.filter((p) => String(p.userId) !== String(userId)),
    })),
  updateParticipant: (state: VoiceState) =>
    set((store) => {
      const normalizedUserId = String(state.userId);
      const normalizedState: VoiceState = { ...state, userId: normalizedUserId };
      const idx = store.participants.findIndex((p) => String(p.userId) === normalizedUserId);

      if (idx === -1) {
        return { participants: [...store.participants, normalizedState] };
      }

      return {
        participants: store.participants.map((p, index) =>
          index === idx ? { ...p, ...normalizedState } : p
        ),
      };
    }),
  setParticipants: (states: VoiceState[]) => set({ participants: states }),
  clearParticipants: () => set({ participants: [], speakingUsers: new Set(), cameraUsers: new Set() }),

  // Speaking
  speakingUsers: new Set(),
  setSpeakingUsers: (users: Set<string>) => set({ speakingUsers: users }),

  // Camera
  cameraUsers: new Set(),
  addCameraUser: (userId: string) =>
    set((store) => {
      const next = new Set(store.cameraUsers);
      next.add(userId);
      return { cameraUsers: next };
    }),
  removeCameraUser: (userId: string) =>
    set((store) => {
      const next = new Set(store.cameraUsers);
      next.delete(userId);
      return { cameraUsers: next };
    }),
  clearCameraUsers: () => set({ cameraUsers: new Set() }),

  // Connection
  isConnected: false,
  setIsConnected: (connected: boolean) => set({ isConnected: connected }),
}));
