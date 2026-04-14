import apiClient from '@/api/client';

export interface DMCallState {
  callId: string;
  conversationId: string;
  callerId: string;
  receiverId: string;
  callerName: string;
  receiverName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'ENDED' | 'MISSED';
  callerMuted: boolean;
  receiverMuted: boolean;
  callerDeafened: boolean;
  receiverDeafened: boolean;
}

export interface AgoraTokenResponse {
  token: string;
  appId: string;
  channelName: string;
  userId: string;
}

export interface DMCallStateResponse {
  hasActiveCall: boolean;
  callState?: DMCallState;
}

class DMCallService {
  private basePath = '/dm/call';

  /**
   * Lấy trạng thái cuộc gọi hiện tại
   */
  async getCallStatus(conversationId: string): Promise<DMCallStateResponse> {
    try {
      const response = await apiClient.get(`${this.basePath}/status`, {
        params: { conversationId },
      });
      return response.data;
    } catch (error) {
      console.error('[DMCallService] getCallStatus error:', error);
      return { hasActiveCall: false };
    }
  }

  /**
   * Bắt đầu cuộc gọi
   */
  async startCall(conversationId: string, callerId: string): Promise<DMCallState | null> {
    try {
      const response = await apiClient.post(`${this.basePath}/start`, {
        conversationId,
        callerId,
      });
      return response.data;
    } catch (error) {
      console.error('[DMCallService] startCall error:', error);
      return null;
    }
  }

  /**
   * Chấp nhận cuộc gọi
   */
  async acceptCall(conversationId: string, userId: string): Promise<DMCallState | null> {
    try {
      const response = await apiClient.post(`${this.basePath}/accept`, {
        conversationId,
        userId,
      });
      return response.data;
    } catch (error) {
      console.error('[DMCallService] acceptCall error:', error);
      return null;
    }
  }

  /**
   * Từ chối cuộc gọi
   */
  async declineCall(conversationId: string, userId: string): Promise<DMCallState | null> {
    try {
      const response = await apiClient.post(`${this.basePath}/decline`, {
        conversationId,
        userId,
      });
      return response.data;
    } catch (error) {
      console.error('[DMCallService] declineCall error:', error);
      return null;
    }
  }

  /**
   * Kết thúc cuộc gọi
   */
  async endCall(conversationId: string, userId: string): Promise<DMCallState | null> {
    try {
      const response = await apiClient.post(`${this.basePath}/end`, {
        conversationId,
        userId,
      });
      return response.data;
    } catch (error) {
      console.error('[DMCallService] endCall error:', error);
      return null;
    }
  }

  /**
   * Cập nhật trạng thái mute/deafen
   */
  async updateState(
    conversationId: string,
    userId: string,
    isMuted: boolean,
    isDeafened: boolean
  ): Promise<DMCallState | null> {
    try {
      const response = await apiClient.post(`${this.basePath}/state`, {
        conversationId,
        userId,
        isMuted,
        isDeafened,
      });
      return response.data;
    } catch (error) {
      console.error('[DMCallService] updateState error:', error);
      return null;
    }
  }

  /**
   * Lấy Agora token cho cuộc gọi
   */
  async getToken(conversationId: string, userId: string): Promise<AgoraTokenResponse | null> {
    try {
      const response = await apiClient.get(`${this.basePath}/token`, {
        params: { conversationId, userId },
      });
      return response.data;
    } catch (error) {
      console.error('[DMCallService] getToken error:', error);
      return null;
    }
  }
}

export const dmCallService = new DMCallService();
