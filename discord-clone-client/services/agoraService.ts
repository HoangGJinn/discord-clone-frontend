import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  UID,
  ChannelMediaOptions,
} from 'agora-rtc-sdk-ng';

/**
 * Agora Service - Quản lý kết nối RTC cho cuộc gọi voice/video
 */
class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: ILocalAudioTrack | null = null;
  private localVideoTrack: ILocalVideoTrack | null = null;
  private remoteVideoTracks: Map<UID, IRemoteVideoTrack> = new Map();
  private remoteAudioTracks: Map<UID, IRemoteAudioTrack> = new Map();
  
  // Callbacks
  private onLocalVideoReady: ((track: ILocalVideoTrack) => void) | null = null;
  private onRemoteVideoReady: ((uid: UID, track: IRemoteVideoTrack) => void) | null = null;
  private onRemoteVideoRemoved: ((uid: UID) => void) | null = null;
  private onRemoteAudioReady: ((uid: UID, track: IRemoteAudioTrack) => void) | null = null;
  private onRemoteAudioRemoved: ((uid: UID) => void) | null = null;
  private onUserJoined: ((uid: UID) => void) | null = null;
  private onUserLeft: ((uid: UID) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private onConnectionStateChange: ((state: string) => void) | null = null;

  /**
   * Khởi tạo Agora client
   */
  async createClient(): Promise<IAgoraRTCClient> {
    if (this.client) {
      await this.leave();
    }
    
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    
    // Set up event listeners
    this.setupEventListeners();
    
    return this.client;
  }

  /**
   * Thiết lập event listeners
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('user-joined', (user) => {
      console.log('[AgoraService] User joined:', user.uid);
      this.onUserJoined?.(user.uid);
    });

    this.client.on('user-left', (user, reason) => {
      console.log('[AgoraService] User left:', user.uid, reason);
      this.onRemoteVideoTracks.delete(user.uid);
      this.remoteAudioTracks.delete(user.uid);
      this.onRemoteVideoRemoved?.(user.uid);
      this.onRemoteAudioRemoved?.(user.uid);
      this.onUserLeft?.(user.uid);
    });

    this.client.on('user-published', async (user, mediaType) => {
      console.log('[AgoraService] User published:', user.uid, mediaType);
      
      // Subscribe to remote media
      if (this.client) {
        await this.client.subscribe(user, mediaType);
      }
    });

    this.client.on('user-unpublished', (user, mediaType) => {
      console.log('[AgoraService] User unpublished:', user.uid, mediaType);
      if (mediaType === 'video') {
        this.remoteVideoTracks.delete(user.uid);
        this.onRemoteVideoRemoved?.(user.uid);
      } else if (mediaType === 'audio') {
        this.remoteAudioTracks.delete(user.uid);
        this.onRemoteAudioRemoved?.(user.uid);
      }
    });

    this.client.on('connection-state-change', (state, reason) => {
      console.log('[AgoraService] Connection state changed:', state, reason);
      this.onConnectionStateChange?.(state);
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
    if (!this.client) {
      await this.createClient();
    }

    if (!this.client) {
      throw new Error('Failed to create Agora client');
    }

    console.log('[AgoraService] Joining channel:', { appId, channelName, token, uid });

    try {
      // Join the channel
      const joinedUid = await this.client.join(appId, channelName, token, uid);
      console.log('[AgoraService] Joined channel with uid:', joinedUid);
      return joinedUid;
    } catch (error) {
      console.error('[AgoraService] Failed to join channel:', error);
      throw error;
    }
  }

  /**
   * Tạo và publish local tracks (audio + optional video)
   */
  async startLocalTracks(enableVideo: boolean = false): Promise<void> {
    try {
      // Create audio track
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true, // Acoustic Echo Cancellation
        ANS: true, // Automatic Noise Suppression
        AGC: true, // Automatic Gain Control
      });

      // Publish audio track
      if (this.client) {
        await this.client.publish(this.localAudioTrack);
        console.log('[AgoraService] Audio track published');
      }

      // Create video track if enabled
      if (enableVideo) {
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: '720p_1', // 720p, 15fps, 1130kbps
          optimizationMode: 'motion',
        });

        if (this.client) {
          await this.client.publish(this.localVideoTrack);
          console.log('[AgoraService] Video track published');
        }

        this.onLocalVideoReady?.(this.localVideoTrack);
      }
    } catch (error) {
      console.error('[AgoraService] Failed to start local tracks:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Rời khỏi kênh và dọn dẹp
   */
  async leave(): Promise<void> {
    try {
      // Stop and destroy local tracks
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      // Leave channel
      if (this.client) {
        await this.client.leave();
        console.log('[AgoraService] Left channel');
      }

      // Clear remote tracks
      this.remoteVideoTracks.clear();
      this.remoteAudioTracks.clear();
    } catch (error) {
      console.error('[AgoraService] Error leaving channel:', error);
    }
  }

  /**
   * Toggle microphone mute
   */
  async setAudioMuted(muted: boolean): Promise<void> {
    if (this.localAudioTrack) {
      this.localAudioTrack.setEnabled(!muted);
      console.log('[AgoraService] Audio muted:', muted);
    }
  }

  /**
   * Toggle camera
   */
  async setVideoEnabled(enabled: boolean): Promise<void> {
    if (this.localVideoTrack) {
      this.localVideoTrack.setEnabled(enabled);
      console.log('[AgoraService] Video enabled:', enabled);
    }
  }

  /**
   * Enable/disable audio track
   */
  async enableAudio(enabled: boolean): Promise<void> {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(enabled);
    }
  }

  /**
   * Enable/disable video track
   */
  async enableVideo(enabled: boolean): Promise<void> {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(enabled);
    }
  }

  /**
   * Thay đổi camera (front/back)
   */
  async switchCamera(): Promise<void> {
    if (this.localVideoTrack) {
      try {
        // For front camera, use 'front', for back use 'back'
        await (this.localVideoTrack as any).setDevice('front');
        console.log('[AgoraService] Camera switched to front');
      } catch (error) {
        console.log('[AgoraService] Camera switch not supported on web');
      }
    }
  }

  /**
   * Lấy local video track
   */
  getLocalVideoTrack(): ILocalVideoTrack | null {
    return this.localVideoTrack;
  }

  /**
   * Lấy local audio track
   */
  getLocalAudioTrack(): ILocalAudioTrack | null {
    return this.localAudioTrack;
  }

  /**
   * Lấy remote video tracks
   */
  getRemoteVideoTracks(): Map<UID, IRemoteVideoTrack> {
    return this.remoteVideoTracks;
  }

  /**
   * Lấy remote audio tracks
   */
  getRemoteAudioTracks(): Map<UID, IRemoteAudioTrack> {
    return this.remoteAudioTracks;
  }

  /**
   * Kiểm tra xem có đang trong cuộc gọi không
   */
  isInCall(): boolean {
    return this.client !== null;
  }

  /**
   * Đăng ký callback cho local video ready
   */
  onLocalVideo(callback: (track: ILocalVideoTrack) => void): void {
    this.onLocalVideoReady = callback;
  }

  /**
   * Đăng ký callback cho remote video ready
   */
  onRemoteVideo(callback: (uid: UID, track: IRemoteVideoTrack) => void): void {
    this.onRemoteVideoReady = callback;
  }

  /**
   * Đăng ký callback khi remote video bị xóa
   */
  onRemoteVideoRemoved(callback: (uid: UID) => void): void {
    this.onRemoteVideoRemoved = callback;
  }

  /**
   * Đăng ký callback cho remote audio ready
   */
  onRemoteAudio(callback: (uid: UID, track: IRemoteAudioTrack) => void): void {
    this.onRemoteAudioReady = callback;
  }

  /**
   * Đăng ký callback khi remote audio bị xóa
   */
  onRemoteAudioRemoved(callback: (uid: UID) => void): void {
    this.onRemoteAudioRemoved = callback;
  }

  /**
   * Đăng ký callback khi user tham gia
   */
  onUserJoined(callback: (uid: UID) => void): void {
    this.onUserJoined = callback;
  }

  /**
   * Đăng ký callback khi user rời đi
   */
  onUserLeft(callback: (uid: UID) => void): void {
    this.onUserLeft = callback;
  }

  /**
   * Đăng ký callback khi có lỗi
   */
  setErrorHandler(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  /**
   * Đăng ký callback khi connection state thay đổi
   */
  onConnectionStateChanged(callback: (state: string) => void): void {
    this.onConnectionStateChange = callback;
  }

  /**
   * Xóa tất cả callbacks
   */
  clearCallbacks(): void {
    this.onLocalVideoReady = null;
    this.onRemoteVideoReady = null;
    this.onRemoteVideoRemoved = null;
    this.onRemoteAudioReady = null;
    this.onRemoteAudioRemoved = null;
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onError = null;
    this.onConnectionStateChange = null;
  }
}

// Export singleton instance
export const agoraService = new AgoraService();
export default agoraService;
