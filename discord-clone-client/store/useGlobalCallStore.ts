import { create } from 'zustand';
import { DMCallState } from '@/services/dmCallService';

/**
 * Global store cho incoming call overlay.
 * Hoạt động ở root level (_layout.tsx) để hiển thị incoming call
 * bất kể user đang ở screen nào.
 */
interface GlobalCallStore {
  // State
  incomingCall: DMCallState | null;
  isVisible: boolean;

  // Actions
  showIncoming: (callState: DMCallState) => void;
  hideIncoming: () => void;
  clearIncoming: () => void;
}

export const useGlobalCallStore = create<GlobalCallStore>((set, get) => ({
  incomingCall: null,
  isVisible: false,

  showIncoming: (callState: DMCallState) => {
    set({ incomingCall: callState, isVisible: true });
  },

  hideIncoming: () => {
    set({ isVisible: false });
    // Delay clear để animation hoàn tất
    setTimeout(() => {
      const { isVisible } = get();
      if (!isVisible) {
        set({ incomingCall: null });
      }
    }, 300);
  },

  clearIncoming: () => {
    set({ incomingCall: null, isVisible: false });
  },
}));
