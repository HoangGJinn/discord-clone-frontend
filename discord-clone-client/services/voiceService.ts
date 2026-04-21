import apiClient from '@/api/client';
import socketService from './socketService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VoiceState {
  userId: string;
  channelId: number;
  serverId: number;
  sessionId?: string;
  isMuted: boolean;
  isDeafened: boolean;
  hasCamera?: boolean;
}

export interface VoiceMessage {
  type: 'JOIN' | 'LEAVE' | 'UPDATE_STATE' | 'INITIAL_SYNC';
  state?: VoiceState;
  states?: VoiceState[];
}

export interface VoiceTokenResponse {
  token: string;
  channelId: number;
  userId: string;
  bitrate: number;
  userLimit: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Lấy Agora RTC token từ backend.
 * Backend route: GET /api/voice/token?channelId=&userId=
 */
export async function getVoiceToken(
  channelId: number,
  userId: string
): Promise<VoiceTokenResponse> {
  try {
    const response = await apiClient.get('/voice/token', {
      params: { channelId, userId },
    });
    return response.data;
  } catch (error) {
    console.error('[VoiceService] getVoiceToken error:', error);
    throw error;
  }
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

const voiceTopic = (serverId: number) => `/topic/server/${serverId}/voice`;

export async function subscribeVoice(
  serverId: number,
  callback: (msg: VoiceMessage) => void
): Promise<void> {
  return socketService.subscribe(voiceTopic(serverId), callback);
}

export function unsubscribeVoice(
  serverId: number,
  callback?: (msg: VoiceMessage) => void
): void {
  socketService.unsubscribe(voiceTopic(serverId), callback);
}

export async function sendVoiceAction(action: VoiceMessage): Promise<boolean> {
  return socketService.send('/app/voice/action', action);
}
