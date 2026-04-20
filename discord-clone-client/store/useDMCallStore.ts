import { create } from 'zustand';
import { dmCallService, DMCallState } from '@/services/dmCallService';

interface DMCallStore {
  // State
  activeCall: DMCallState | null;
  isConnecting: boolean;
  isRinging: boolean;
  agoraToken: string | null;
  agoraAppId: string | null;
  agoraChannelName: string | null;

  // Actions
  startCall: (conversationId: string, callerId: string, callType?: 'VOICE' | 'VIDEO') => Promise<boolean>;
  acceptCall: (conversationId: string, userId: string) => Promise<boolean>;
  declineCall: (conversationId: string, userId: string) => Promise<boolean>;
  endCall: (conversationId: string, userId: string) => Promise<boolean>;
  updateCallState: (callState: DMCallState) => void;
  setIncomingCall: (callState: DMCallState) => void;
  setRinging: (isRinging: boolean) => void;
  updateMuteState: (isMuted: boolean, isDeafened: boolean) => void;
  clearCall: () => void;
  fetchAgoraToken: (conversationId: string, userId: string) => Promise<{ token: string; appId: string; channelName: string } | null>;
}

export const useDMCallStore = create<DMCallStore>((set, get) => ({
  // Initial state
  activeCall: null,
  isConnecting: false,
  isRinging: false,
  agoraToken: null,
  agoraAppId: null,
  agoraChannelName: null,

  /**
   * Bắt đầu cuộc gọi (voice hoặc video)
   */
  startCall: async (conversationId: string, callerId: string, callType: 'VOICE' | 'VIDEO' = 'VOICE') => {
    try {
      set({ isConnecting: true });
      
      const callState = await dmCallService.startCall(conversationId, callerId, callType);
      if (callState) {
        set({ 
          activeCall: callState, 
          isConnecting: false,
          isRinging: true 
        });
        return true;
      }
      
      set({ isConnecting: false });
      return false;
    } catch (error) {
      console.error('[DMCallStore] startCall error:', error);
      set({ isConnecting: false });
      return false;
    }
  },

  /**
   * Chấp nhận cuộc gọi
   */
  acceptCall: async (conversationId: string, userId: string) => {
    try {
      set({ isConnecting: true });

      const callState = await dmCallService.acceptCall(conversationId, userId);
      if (callState) {
        // Lấy Agora token sau khi accept
        const tokenData = await dmCallService.getToken(conversationId, userId);

        set({
          activeCall: callState,
          agoraToken: tokenData?.token || null,
          agoraAppId: tokenData?.appId || null,
          agoraChannelName: tokenData?.channelName || null,
          isConnecting: false,
          isRinging: false
        });

        return true;
      }

      set({ isConnecting: false });
      return false;
    } catch (error) {
      console.error('[DMCallStore] acceptCall error:', error);
      set({ isConnecting: false });
      return false;
    }
  },

  /**
   * Từ chối cuộc gọi
   */
  declineCall: async (conversationId: string, userId: string) => {
    try {
      const result = await dmCallService.declineCall(conversationId, userId);
      if (result) {
        set({ 
          activeCall: null, 
          isRinging: false,
          agoraToken: null,
          agoraAppId: null
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[DMCallStore] declineCall error:', error);
      return false;
    }
  },

  /**
   * Kết thúc cuộc gọi
   */
  endCall: async (conversationId: string, userId: string) => {
    try {
      await dmCallService.endCall(conversationId, userId);
      set({
        activeCall: null,
        isRinging: false,
        agoraToken: null,
        agoraAppId: null
      });
      return true;
    } catch (error) {
      console.error('[DMCallStore] endCall error:', error);
      set({
        activeCall: null,
        isRinging: false,
        agoraToken: null,
        agoraAppId: null
      });
      return false;
    }
  },

  /**
   * Cập nhật trạng thái cuộc gọi từ WebSocket
   */
  updateCallState: (callState: DMCallState) => {
    set({ activeCall: callState });
  },

  /**
   * Thiết lập cuộc gọi đến
   */
  setIncomingCall: (callState: DMCallState) => {
    set({ 
      activeCall: callState, 
      isRinging: true 
    });
  },

  /**
   * Thiết lập trạng thái đổ chuông
   */
  setRinging: (isRinging: boolean) => {
    set({ isRinging });
  },

  /**
   * Cập nhật trạng thái mute/deafen lên server
   */
  updateMuteState: async (isMuted: boolean, isDeafened: boolean) => {
    const { activeCall } = get();
    if (!activeCall) return;
    
    try {
      const callState = await dmCallService.updateState(
        activeCall.conversationId,
        activeCall.callerId,
        isMuted,
        isDeafened
      );
      
      if (callState) {
        set({ activeCall: callState });
      }
    } catch (error) {
      console.error('[DMCallStore] updateMuteState error:', error);
    }
  },

  /**
   * Xóa cuộc gọi
   */
  clearCall: () => {
    set({
      activeCall: null,
      isConnecting: false,
      isRinging: false,
      agoraToken: null,
      agoraAppId: null,
      agoraChannelName: null,
    });
  },

  /**
   * Lấy Agora token
   */
  fetchAgoraToken: async (conversationId: string, userId: string) => {
    try {
      const tokenData = await dmCallService.getToken(conversationId, userId);
      if (tokenData) {
        set({
          agoraToken: tokenData.token,
          agoraAppId: tokenData.appId,
          agoraChannelName: tokenData.channelName,
        });
        return {
          token: tokenData.token,
          appId: tokenData.appId,
          channelName: tokenData.channelName,
        };
      }
      return null;
    } catch (error) {
      console.error('[DMCallStore] fetchAgoraToken error:', error);
      return null;
    }
  }
}));
