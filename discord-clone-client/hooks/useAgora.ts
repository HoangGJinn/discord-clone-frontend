import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { agoraService } from '@/services/agoraService';

export interface AgoraUser {
  uid: string | number;
  hasVideo: boolean;
  hasAudio: boolean;
}

/**
 * Hook quản lý Agora RTC connection cho cuộc gọi
 */
export function useAgora(conversationId: string, currentUserId: string) {
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<Map<string | number, AgoraUser>>(new Map());
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
  const [remoteVideoTracks, setRemoteVideoTracks] = useState<Map<string | number, any>>(new Map());
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const hasJoinedRef = useRef(false);
  const conversationIdRef = useRef(conversationId);

  // Update ref when conversationId changes
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // ── Permission Handling ───────────────────────────────────────
  const requestPermissions = useCallback(async (enableVideo: boolean): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        // Request audio permission
        const audioPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Discord Clone needs access to your microphone for voice calls.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (audioPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[useAgora] Audio permission denied');
          Alert.alert(
            'Permission Required',
            'Microphone permission is required for voice calls.'
          );
          return false;
        }

        // Request camera permission if video is enabled
        if (enableVideo) {
          const cameraPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'Discord Clone needs access to your camera for video calls.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          if (cameraPermission !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('[useAgora] Camera permission denied');
            Alert.alert(
              'Permission Required',
              'Camera permission is required for video calls.'
            );
            return false;
          }
        }
      }
      return true;
    } catch (err) {
      console.error('[useAgora] Permission error:', err);
      return true; // Continue anyway for web
    }
  }, []);

  // ── Setup Callbacks ──────────────────────────────────────────
  useEffect(() => {
    // Set up Agora callbacks
    agoraService.onUserJoined((uid) => {
      console.log('[useAgora] Remote user joined:', uid);
      setRemoteUsers((prev) => {
        const newMap = new Map(prev);
        newMap.set(uid, { uid, hasVideo: true, hasAudio: true });
        return newMap;
      });
    });

    agoraService.onUserLeft((uid) => {
      console.log('[useAgora] Remote user left:', uid);
      setRemoteUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(uid);
        return newMap;
      });
      setRemoteVideoTracks((prev) => {
        const newMap = new Map(prev);
        newMap.delete(uid);
        return newMap;
      });
    });

    agoraService.onLocalVideo((uid) => {
      console.log('[useAgora] Local video track ready');
      setLocalVideoTrack(uid);
    });

    agoraService.onRemoteVideo((uid) => {
      console.log('[useAgora] Remote video stream ready:', uid);
      setRemoteVideoTracks((prev) => {
        const newMap = new Map(prev);
        newMap.set(uid, true);
        return newMap;
      });
    });

    agoraService.onRemoteVideoRemoved((uid) => {
      console.log('[useAgora] Remote video track removed:', uid);
      setRemoteVideoTracks((prev) => {
        const newMap = new Map(prev);
        newMap.delete(uid);
        return newMap;
      });
    });

    agoraService.onConnectionStateChanged((state) => {
      console.log('[useAgora] Connection state:', state);
      const stateStr = String(state);
      setConnectionState(stateStr);
      if (stateStr === '3') {
        setIsJoined(true);
        setIsConnecting(false);
      } else if (stateStr === '1' || stateStr === '5') {
        setIsJoined(false);
        setIsConnecting(false);
      }
    });

    agoraService.setErrorHandler((err) => {
      console.error('[useAgora] Agora error:', err);
      setError(err.message);
      setIsConnecting(false);
    });

    return () => {
      // Cleanup callbacks
      agoraService.clearCallbacks();
    };
  }, []);

  // ── Join Channel ──────────────────────────────────────────────
  const joinChannel = useCallback(async (
    appId: string,
    channelName: string,
    token: string,
    uid: string | number,
    enableVideo: boolean = false
  ) => {
    // Prevent duplicate joins
    if (hasJoinedRef.current) {
      console.log('[useAgora] Already joined, skipping...');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Request permissions
      const hasPermission = await requestPermissions(enableVideo);
      if (!hasPermission) {
        setIsConnecting(false);
        return;
      }

      console.log('[useAgora] Joining channel...', { appId, channelName, uid });

      // Join will initialize engine internally with appId when needed
      await agoraService.joinChannel(appId, channelName, token, uid);
      
      // Start local tracks
      await agoraService.startLocalTracks(enableVideo);
      
      hasJoinedRef.current = true;
      console.log('[useAgora] Joined successfully');
    } catch (err) {
      console.error('[useAgora] Failed to join:', err);
      setError((err as Error).message);
      setIsConnecting(false);
      hasJoinedRef.current = false;
    }
  }, [requestPermissions]);

  // ── Leave Channel ─────────────────────────────────────────────
  const leaveChannel = useCallback(async () => {
    try {
      console.log('[useAgora] Leaving channel...');
      await agoraService.leave();
      setIsJoined(false);
      setIsConnecting(false);
      setRemoteUsers(new Map());
      setRemoteVideoTracks(new Map());
      setLocalVideoTrack(null);
      hasJoinedRef.current = false;
      console.log('[useAgora] Left channel');
    } catch (err) {
      console.error('[useAgora] Error leaving channel:', err);
    }
  }, []);

  // ── Toggle Mute ──────────────────────────────────────────────
  const toggleMute = useCallback(async (isMuted: boolean) => {
    await agoraService.setAudioMuted(isMuted);
  }, []);

  // ── Toggle Video ─────────────────────────────────────────────
  const toggleVideo = useCallback(async (isVideoOn: boolean) => {
    await agoraService.enableVideo(isVideoOn);
  }, []);

  // ── Switch Camera ────────────────────────────────────────────
  const switchCamera = useCallback(async () => {
    await agoraService.switchCamera();
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (hasJoinedRef.current) {
        agoraService.leave();
        hasJoinedRef.current = false;
      }
    };
  }, []);

  return {
    // State
    isJoined,
    isConnecting,
    remoteUsers,
    localVideoTrack,
    remoteVideoTracks,
    connectionState,
    error,

    // Actions
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleVideo,
    switchCamera,
  };
}

export default useAgora;
