import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
} from 'react-native-agora';

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
      this.engine = createAgoraRtcEngine();
      const initResult = this.engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      if (initResult < 0) {
        throw new Error(`Agora initialize failed with code ${initResult}`);
      }

      this.initializedAppId = appId;

      // Set up event listeners
      this.setupEventListeners();
      
      return this.engine;
    } catch (error) {
      console.error('[AgoraService] Failed to create engine:', error);
      throw error;
    }
  }

  /**
   * Thiết lập event listeners
   */
  private setupEventListeners(): void {
    if (!this.engine) return;

    // User joined
    this.engine.addListener('onUserJoined', (connection, remoteUid) => {
      console.log('[AgoraService] User joined:', remoteUid);
      this.onUserJoinedCallback?.(remoteUid);
    });

    // User left
    this.engine.addListener('onUserOffline', (connection, remoteUid, reason) => {
      console.log('[AgoraService] User left:', remoteUid, reason);
      this.onRemoteVideoRemovedCallback?.(remoteUid);
      this.onRemoteAudioRemovedCallback?.(remoteUid);
      this.onUserLeftCallback?.(remoteUid);
    });

    // Remote video state changed
    this.engine.addListener('onRemoteVideoStateChanged', (connection, remoteUid, state, reason, elapsed) => {
      console.log('[AgoraService] Remote video state changed:', remoteUid, state);
      if (state === 1) { // REMOTE_VIDEO_STATE_DECODING = 1
        this.onRemoteVideoReadyCallback?.(remoteUid);
      } else if (state === 0) { // REMOTE_VIDEO_STATE_STOPPED = 0
        this.onRemoteVideoRemovedCallback?.(remoteUid);
      }
    });

    // Connection state changed
    this.engine.addListener('onConnectionStateChanged', (connection, state, reason) => {
      console.log('[AgoraService] Connection state changed:', state, reason);
      this.onConnectionStateChangeCallback?.(state);
    });

    // Error
    this.engine.addListener('onError', (errorCode) => {
      console.error('[AgoraService] Error code:', errorCode);
      this.onErrorCallback?.(new Error(`Agora error code: ${errorCode}`));
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

    if (!this.engine) {
      throw new Error('Failed to create Agora engine');
    }

    const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;
    const normalizedToken = token && token.trim().length > 0 ? token : null;

    console.log('[AgoraService] Joining channel:', {
      appId,
      channelName,
      token: normalizedToken ? '[provided]' : '[none]',
      uid: numericUid,
    });

    try {
      // Enable video if needed
      await this.engine.enableVideo();
      await this.engine.enableAudio();
      
      // Join the channel
      const joinResult = this.engine.joinChannel(
        normalizedToken,
        channelName,
        numericUid,
        {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          autoSubscribeVideo: true,
          autoSubscribeAudio: true,
        }
      );

      if (joinResult < 0) {
        throw new Error(`Agora joinChannel failed with code ${joinResult}`);
      }

      this.isInChannelFlag = true;
      console.log('[AgoraService] Joined channel with result:', joinResult);
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
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    try {
      // Start local audio stream
      await this.engine.enableLocalAudio(true);
      this.localAudioEnabled = true;
      console.log('[AgoraService] Audio track started');

      // Start local video stream if enabled
      if (enableVideo) {
        await this.engine.enableLocalVideo(true);
        await this.engine.startPreview();
        this.localVideoEnabled = true;
        console.log('[AgoraService] Video track started');
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
      if (this.engine) {
        // Stop preview
        if (this.localVideoEnabled) {
          await this.engine.stopPreview();
          await this.engine.enableLocalVideo(false);
        }

        // Stop local audio
        if (this.localAudioEnabled) {
          await this.engine.enableLocalAudio(false);
        }

        // Leave channel
        this.engine.leaveChannel();
        console.log('[AgoraService] Left channel');
      }

      this.isInChannelFlag = false;
      this.localVideoEnabled = false;
      this.localAudioEnabled = false;
    } catch (error) {
      console.error('[AgoraService] Error leaving channel:', error);
    }
  }

  /**
   * Toggle microphone mute
   */
  async setAudioMuted(muted: boolean): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.muteLocalAudioStream(muted);
        console.log('[AgoraService] Audio muted:', muted);
      } catch (error) {
        console.error('[AgoraService] Failed to mute audio:', error);
      }
    }
  }

  /**
   * Toggle camera
   */
  async setVideoEnabled(enabled: boolean): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.enableLocalVideo(enabled);
        if (enabled) {
          await this.engine.startPreview();
        } else {
          await this.engine.stopPreview();
        }
        this.localVideoEnabled = enabled;
        console.log('[AgoraService] Video enabled:', enabled);
      } catch (error) {
        console.error('[AgoraService] Failed to toggle video:', error);
      }
    }
  }

  /**
   * Enable/disable audio track
   */
  async enableAudio(enabled: boolean): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.enableLocalAudio(enabled);
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
    if (this.engine) {
      try {
        await this.engine.enableLocalVideo(enabled);
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
    if (this.engine) {
      try {
        await this.engine.switchCamera();
        console.log('[AgoraService] Camera switched');
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
  }
}

// Export singleton instance
export const agoraService = new AgoraService();
export default agoraService;
