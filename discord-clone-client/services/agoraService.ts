import { Platform } from 'react-native';
import type { IRtcEngine, RtcConnection } from 'react-native-agora';

let agora: any = null;
if (Platform.OS !== 'web') {
  try {
    agora = require('react-native-agora');
  } catch (e) {
    console.warn('react-native-agora not available:', e);
  }
}

// Extract types and constants safely
const ChannelProfileType = agora?.ChannelProfileType ?? {};
const ClientRoleType = agora?.ClientRoleType ?? {};
const createAgoraRtcEngine = agora?.createAgoraRtcEngine ?? (() => {
  console.warn('Agora engine not available on this platform');
  return null;
});

type UID = number | string;

/**
 * Agora Service - Quản lý kết nối RTC cho cuộc gọi voice/video
 * React Native version using react-native-agora SDK
 */
class AgoraService {
  private engine: IRtcEngine | null = null;
  private initializedAppId: string | null = null;
  private localVideoEnabled: boolean = false;
  private localAudioEnabled: boolean = false;
  private isInChannelFlag: boolean = false;
  private localUidHint: number | null = null;
  private localUserAccount: string | null = null;
  
  // Callbacks
  private onLocalVideoReadyCallback: ((uid: UID) => void) | null = null;
  private onRemoteVideoReadyCallback: ((uid: UID) => void) | null = null;
  private onRemoteVideoRemovedCallback: ((uid: UID) => void) | null = null;
  private onRemoteAudioReadyCallback: ((uid: UID) => void) | null = null;
  private onRemoteAudioRemovedCallback: ((uid: UID) => void) | null = null;
  private onUserJoinedCallback: ((uid: UID) => void) | null = null;
  private onUserLeftCallback: ((uid: UID) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: number) => void) | null = null;
  private onRemoteSpeakingCallback: ((isSpeaking: boolean, uid: UID) => void) | null = null;
  private onLocalSpeakingCallback: ((isSpeaking: boolean, volume: number) => void) | null = null;

  /**
   * Khởi tạo Agora engine
   */
  async createClient(appId: string): Promise<IRtcEngine> {
    if (!appId) {
      throw new Error('Agora appId is required');
    }

    if (this.engine && this.initializedAppId === appId) {
      return this.engine;
    }

    if (this.engine) {
      await this.leave();
      this.engine.release();
      this.engine = null;
      this.initializedAppId = null;
    }

    try {
      const engine = createAgoraRtcEngine();
      if (!engine) {
        throw new Error('Agora engine is not available on this platform');
      }
      this.engine = engine;

      const initResult = engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      if (initResult < 0) {
        throw new Error(`Agora initialize failed with code ${initResult}`);
      }

      this.initializedAppId = appId;

      // Set up event listeners
      this.setupEventListeners();
      
      return engine;
    } catch (error) {
      console.error('[AgoraService] Failed to create engine:', error);
      throw error;
    }
  }

  /**
   * Thiết lập event listeners
   */
  private setupEventListeners(): void {
    const engine = this.engine;
    if (!engine) return;

    // User joined
    engine.addListener('onUserJoined', (connection: RtcConnection, remoteUid: number) => {
      this.onUserJoinedCallback?.(remoteUid);
    });

    // User left
    engine.addListener('onUserOffline', (connection: RtcConnection, remoteUid: number, reason: number) => {
      this.onRemoteVideoRemovedCallback?.(remoteUid);
      this.onRemoteAudioRemovedCallback?.(remoteUid);
      this.onUserLeftCallback?.(remoteUid);
    });

    // Remote video state changed
    engine.addListener('onRemoteVideoStateChanged', (connection: RtcConnection, remoteUid: number, state: number, reason: number, elapsed: number) => {
      if (state === 1) { // REMOTE_VIDEO_STATE_DECODING = 1
        this.onRemoteVideoReadyCallback?.(remoteUid);
      } else if (state === 0) { // REMOTE_VIDEO_STATE_STOPPED = 0
        this.onRemoteVideoRemovedCallback?.(remoteUid);
      }
    });

    // Remote audio state changed
    engine.addListener('onRemoteAudioStateChanged', (connection: RtcConnection, remoteUid: number, state: number, reason: number, elapsed: number) => {
      if (state === 3) { // REMOTE_AUDIO_STATE_DECODING = 3
        this.onRemoteAudioReadyCallback?.(remoteUid);
      } else if (state === 0) { // REMOTE_AUDIO_STATE_STOPPED = 0
        this.onRemoteAudioRemovedCallback?.(remoteUid);
      }
    });

    // Connection state changed
    engine.addListener('onConnectionStateChanged', (connection: RtcConnection, state: number, reason: number) => {
      this.onConnectionStateChangeCallback?.(state);
    });

    // Error
    engine.addListener('onError', (errorCode: number) => {
      console.error('[AgoraService] Error code:', errorCode);
      this.onErrorCallback?.(new Error(`Agora error code: ${errorCode}`));
    });

    // Audio volume indication for speaking indicator.
    engine.addListener('onAudioVolumeIndication', (...args: any[]) => {
      try {
        const speakers: any[] = Array.isArray(args[0])
          ? args[0]
          : Array.isArray(args[1])
            ? args[1]
            : [];
        let localSpeaking = false;
        let localVolume = 0;
        let remoteSpeakingUid: UID | null = null;
        const threshold = 8;

        for (const speaker of speakers || []) {
          const uid = speaker?.uid;
          const volume = Number(speaker?.volume ?? 0);
          const userAccount = speaker?.userAccount ? String(speaker.userAccount) : null;
          const isSpeaking = volume > threshold;
          const isLocalSpeaker =
            uid === 0 ||
            (typeof uid === 'number' && this.localUidHint != null && uid === this.localUidHint) ||
            (userAccount != null && this.localUserAccount != null && userAccount === this.localUserAccount);

          if (isLocalSpeaker) {
            localSpeaking = isSpeaking;
            localVolume = volume;
          } else if (isSpeaking && remoteSpeakingUid == null) {
            remoteSpeakingUid = userAccount ?? uid;
          }
        }

        this.onLocalSpeakingCallback?.(localSpeaking, localVolume);
        if (remoteSpeakingUid != null) {
          this.onRemoteSpeakingCallback?.(true, remoteSpeakingUid);
        } else {
          this.onRemoteSpeakingCallback?.(false, 0);
        }
      } catch (error) {
        console.error('[AgoraService] onAudioVolumeIndication handler error:', error);
      }
    });
  }

  /**
   * Tham gia kênh
   */
  async joinChannel(
    appId: string,
    channelName: string,
    token: string,
    uid: string | number
  ): Promise<number> {
    if (!this.engine || this.initializedAppId !== appId) {
      await this.createClient(appId);
    }

    const engine = this.engine;
    if (!engine) {
      throw new Error('Failed to create Agora engine');
    }

    const userAccount = String(uid);
    const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;
    // Keep empty-string token for App ID testing mode.
    // Passing null can be interpreted as invalid token in some SDK/runtime paths.
    const normalizedToken = typeof token === 'string' ? token.trim() : '';

    try {
      // Enable video if needed
      await engine.enableVideo();
      await engine.enableAudio();
      if (typeof engine.setDefaultAudioRouteToSpeakerphone === 'function') {
        engine.setDefaultAudioRouteToSpeakerphone(true);
      }
      if (typeof engine.setEnableSpeakerphone === 'function') {
        await engine.setEnableSpeakerphone(true);
      }
      if (typeof engine.muteAllRemoteAudioStreams === 'function') {
        await engine.muteAllRemoteAudioStreams(false);
      }
      
      // Join the channel
      const mediaOptions = {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: false,
        autoSubscribeVideo: true,
        autoSubscribeAudio: true,
      };

      let joinResult: number;
      if (typeof engine.joinChannelWithUserAccount === 'function') {
        // Backend DM call token is created with userAccount. Must join by userAccount.
        joinResult = engine.joinChannelWithUserAccount(
          normalizedToken,
          channelName,
          userAccount,
          mediaOptions
        );
      } else {
        // Fallback for SDK variants without userAccount API.
        joinResult = engine.joinChannel(
          normalizedToken,
          channelName,
          numericUid,
          mediaOptions
        );
      }

      if (joinResult < 0) {
        throw new Error(`Agora joinChannel failed with code ${joinResult}`);
      }

      this.isInChannelFlag = true;
      this.localUidHint = Number.isFinite(Number(numericUid)) ? Number(numericUid) : null;
      this.localUserAccount = userAccount;
      engine.updateChannelMediaOptions?.({
        publishMicrophoneTrack: true,
        publishCameraTrack: false,
        autoSubscribeAudio: true,
      });
      if (typeof engine.enableAudioVolumeIndication === 'function') {
        // 200ms interval gives responsive speaking indicator.
        engine.enableAudioVolumeIndication(200, 3, true);
      }
      return numericUid;
    } catch (error) {
      console.error('[AgoraService] Failed to join channel:', error);
      throw error;
    }
  }

  /**
   * Tạo và publish local tracks (audio + optional video)
   */
  async startLocalTracks(enableVideo: boolean = false): Promise<void> {
    const engine = this.engine;
    if (!engine) {
      throw new Error('Engine not initialized');
    }

    try {
      // Start local audio stream
      await engine.enableLocalAudio(true);
      await engine.muteLocalAudioStream(false);
      engine.updateChannelMediaOptions?.({
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: enableVideo,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
      });
      if (typeof engine.adjustRecordingSignalVolume === 'function') {
        await engine.adjustRecordingSignalVolume(100);
      }
      this.localAudioEnabled = true;

      // Start local video stream if enabled
      if (enableVideo) {
        await engine.enableVideo();
        await engine.enableLocalVideo(true);
        if (typeof engine.muteLocalVideoStream === 'function') {
          await engine.muteLocalVideoStream(false);
        }
        await engine.startPreview();
        this.localVideoEnabled = true;
        this.onLocalVideoReadyCallback?.(0); // 0 for local user
      }
    } catch (error) {
      console.error('[AgoraService] Failed to start local tracks:', error);
      this.onErrorCallback?.(error as Error);
      throw error;
    }
  }

  /**
   * Rời khỏi kênh và dọn dẹp
   */
  async leave(): Promise<void> {
    try {
      const engine = this.engine;
      if (engine) {
        // Stop preview
        if (this.localVideoEnabled) {
          await engine.stopPreview();
          await engine.enableLocalVideo(false);
        }

        // Stop local audio
        if (this.localAudioEnabled) {
          await engine.enableLocalAudio(false);
        }

        // Leave channel
        engine.leaveChannel();
      }

      this.isInChannelFlag = false;
      this.localVideoEnabled = false;
      this.localAudioEnabled = false;
      this.localUidHint = null;
      this.localUserAccount = null;
    } catch (error) {
      console.error('[AgoraService] Error leaving channel:', error);
    }
  }

  /**
   * Toggle microphone mute
   */
  async setAudioMuted(muted: boolean): Promise<void> {
    const engine = this.engine;
    if (engine) {
      try {
        await engine.muteLocalAudioStream(muted);
        engine.updateChannelMediaOptions?.({
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: !muted,
          publishCameraTrack: this.localVideoEnabled,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });
      } catch (error) {
        console.error('[AgoraService] Failed to mute audio:', error);
      }
    }
  }

  /**
   * Toggle playback of all remote audio streams.
   * Used for "deafen" (self cannot hear others).
   */
  async setRemoteAudioPlaybackMuted(muted: boolean): Promise<void> {
    const engine = this.engine;
    if (engine && typeof engine.muteAllRemoteAudioStreams === 'function') {
      try {
        await engine.muteAllRemoteAudioStreams(muted);
      } catch (error) {
        console.error('[AgoraService] Failed to toggle remote audio playback:', error);
      }
    }
  }

  /**
   * Toggle camera
   */
  async setVideoEnabled(enabled: boolean): Promise<void> {
    const engine = this.engine;
    if (engine) {
      try {
        await engine.enableVideo();
        await engine.enableLocalVideo(enabled);
        if (enabled) {
          if (typeof engine.muteLocalVideoStream === 'function') {
            await engine.muteLocalVideoStream(false);
          }
          await engine.startPreview();
        } else {
          if (typeof engine.muteLocalVideoStream === 'function') {
            await engine.muteLocalVideoStream(true);
          }
          await engine.stopPreview();
        }
        engine.updateChannelMediaOptions?.({
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: this.localAudioEnabled,
          publishCameraTrack: enabled,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        });
        this.localVideoEnabled = enabled;
      } catch (error) {
        console.error('[AgoraService] Failed to toggle video:', error);
      }
    }
  }

  /**
   * Enable/disable audio track
   */
  async enableAudio(enabled: boolean): Promise<void> {
    const engine = this.engine;
    if (engine) {
      try {
        await engine.enableLocalAudio(enabled);
        this.localAudioEnabled = enabled;
      } catch (error) {
        console.error('[AgoraService] Failed to enable audio:', error);
      }
    }
  }

  /**
   * Enable/disable video track
   */
  async enableVideo(enabled: boolean): Promise<void> {
    const engine = this.engine;
    if (engine) {
      try {
        await engine.enableLocalVideo(enabled);
        this.localVideoEnabled = enabled;
      } catch (error) {
        console.error('[AgoraService] Failed to enable video:', error);
      }
    }
  }

  /**
   * Thay đổi camera (front/back)
   */
  async switchCamera(): Promise<void> {
    const engine = this.engine;
    if (engine) {
      try {
        await engine.switchCamera();
      } catch (error) {
        console.error('[AgoraService] Failed to switch camera:', error);
      }
    }
  }

  /**
   * Kiểm tra xem có đang trong cuộc gọi không
   */
  isInCall(): boolean {
    return this.isInChannelFlag;
  }

  /**
   * Đăng ký callback cho local video ready
   */
  onLocalVideo(callback: (uid: UID) => void): void {
    this.onLocalVideoReadyCallback = callback;
  }

  /**
   * Đăng ký callback cho remote video ready
   */
  onRemoteVideo(callback: (uid: UID) => void): void {
    this.onRemoteVideoReadyCallback = callback;
  }

  /**
   * Đăng ký callback khi remote video bị xóa
   */
  onRemoteVideoRemoved(callback: (uid: UID) => void): void {
    this.onRemoteVideoRemovedCallback = callback;
  }

  /**
   * Đăng ký callback cho remote audio ready
   */
  onRemoteAudio(callback: (uid: UID) => void): void {
    this.onRemoteAudioReadyCallback = callback;
  }

  /**
   * Đăng ký callback khi remote audio bị xóa
   */
  onRemoteAudioRemoved(callback: (uid: UID) => void): void {
    this.onRemoteAudioRemovedCallback = callback;
  }

  /**
   * Đăng ký callback khi user tham gia
   */
  onUserJoined(callback: (uid: UID) => void): void {
    this.onUserJoinedCallback = callback;
  }

  /**
   * Đăng ký callback khi user rời đi
   */
  onUserLeft(callback: (uid: UID) => void): void {
    this.onUserLeftCallback = callback;
  }

  /**
   * Đăng ký callback khi có lỗi
   */
  setErrorHandler(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Đăng ký callback khi connection state thay đổi
   */
  onConnectionStateChanged(callback: (state: number) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  onRemoteSpeaking(callback: (isSpeaking: boolean, uid: UID) => void): void {
    this.onRemoteSpeakingCallback = callback;
  }

  onLocalSpeaking(callback: (isSpeaking: boolean, volume: number) => void): void {
    this.onLocalSpeakingCallback = callback;
  }

  /**
   * Xóa tất cả callbacks
   */
  clearCallbacks(): void {
    this.onLocalVideoReadyCallback = null;
    this.onRemoteVideoReadyCallback = null;
    this.onRemoteVideoRemovedCallback = null;
    this.onRemoteAudioReadyCallback = null;
    this.onRemoteAudioRemovedCallback = null;
    this.onUserJoinedCallback = null;
    this.onUserLeftCallback = null;
    this.onErrorCallback = null;
    this.onConnectionStateChangeCallback = null;
    this.onRemoteSpeakingCallback = null;
    this.onLocalSpeakingCallback = null;
  }
}

// Export singleton instance
export const agoraService = new AgoraService();
export default agoraService;
