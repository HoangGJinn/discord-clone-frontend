import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { dmCallService, DMCallState } from '@/services/dmCallService';
import { useDMCallStore } from '@/store/useDMCallStore';
import { agoraService } from '@/services/agoraService';
import socketService from '@/services/socketService';

/**
 * Hook quản lý DM Voice/Video Call với Agora RTC integration
 * Backend sẽ broadcast WebSocket messages khi REST API được gọi,
 * nên hook này chỉ cần subscribe để lắng nghe và gọi REST API.
 */
export function useDMCall(conversationId: string, currentUserId: string) {
  const {
    activeCall,
    isConnecting,
    isRinging,
    agoraToken,
    agoraAppId,
    agoraChannelName,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    updateCallState,
    setIncomingCall,
    setRinging,
    updateMuteState,
    clearCall,
    fetchAgoraToken,
  } = useDMCallStore();

  const agoraJoinedRef = useRef(false);
  const agoraJoiningRef = useRef(false);
  const lastAcceptedEventKeyRef = useRef<string | null>(null);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  useEffect(() => {
    agoraService.onRemoteAudio(() => undefined);
    agoraService.onRemoteAudioRemoved(() => undefined);
    agoraService.onRemoteSpeaking((isSpeaking) => {
      setIsRemoteSpeaking(isSpeaking);
    });
    agoraService.onLocalSpeaking((isSpeaking) => {
      setIsLocalSpeaking(isSpeaking);
    });
    return () => {
      agoraService.onRemoteAudio(() => undefined);
      agoraService.onRemoteAudioRemoved(() => undefined);
      agoraService.onRemoteSpeaking(() => undefined);
      agoraService.onLocalSpeaking(() => undefined);
      setIsRemoteSpeaking(false);
      setIsLocalSpeaking(false);
    };
  }, []);

  const requestCallPermissions = useCallback(async (enableVideo: boolean): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const audioPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Discord Clone needs microphone access for DM calls.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      if (audioPermission !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission required', 'Microphone permission is required for DM calls.');
        return false;
      }

      if (enableVideo) {
        const cameraPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Discord Clone needs camera access for video calls.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );

        if (cameraPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission required', 'Camera permission is required for video calls.');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[useDMCall] Permission request failed:', error);
      return false;
    }
  }, []);

  // ── Join Agora Channel ────────────────────────────────────────
  const joinAgoraChannel = useCallback(async () => {
    if (!agoraAppId || !agoraChannelName || agoraJoinedRef.current || agoraJoiningRef.current) {
      return;
    }

    const enableVideo = activeCall?.callType === 'VIDEO';
    
    try {
      agoraJoiningRef.current = true;
      const hasPermission = await requestCallPermissions(enableVideo);
      if (!hasPermission) {
        throw new Error('Missing required microphone/camera permission');
      }

      let tokenToUse = agoraToken?.trim() || '';
      if (!tokenToUse) {
        const tokenData = await fetchAgoraToken(conversationId, currentUserId);
        tokenToUse = tokenData?.token?.trim() || '';
      }

      // Testing mode support:
      // Backend may intentionally return empty token when app certificate is not configured.
      // In this mode we still attempt joining with token=null.
      const tokenForJoin = tokenToUse || null;

      await agoraService.joinChannel(agoraAppId, agoraChannelName, tokenForJoin ?? '', currentUserId);
      await agoraService.startLocalTracks(enableVideo);
      
      agoraJoinedRef.current = true;
    } catch (error) {
      console.error('[useDMCall] Failed to join Agora channel:', error);
      agoraJoinedRef.current = false;
    } finally {
      agoraJoiningRef.current = false;
    }
  }, [
    activeCall?.callType,
    agoraAppId,
    agoraChannelName,
    agoraToken,
    conversationId,
    currentUserId,
    fetchAgoraToken,
    requestCallPermissions,
  ]);

  // ── Leave Agora Channel ───────────────────────────────────────
  const leaveAgoraChannel = useCallback(async () => {
    agoraJoiningRef.current = false;

    if (agoraJoinedRef.current) {
      try {
        await agoraService.leave();
        agoraJoinedRef.current = false;
      } catch (error) {
        console.error('[useDMCall] Error leaving Agora channel:', error);
      }
    }
  }, []);

  // ── Auto-join Agora when call is accepted ───────────────────
  useEffect(() => {
    if (activeCall?.status === 'ACCEPTED' && agoraAppId && agoraChannelName && !agoraJoinedRef.current) {
      void joinAgoraChannel();
    }
  }, [activeCall?.status, agoraToken, agoraAppId, agoraChannelName, joinAgoraChannel]);

  // Testing-mode safety net:
  // if call is ACCEPTED but token/app/channel are still empty, force a token refresh.
  useEffect(() => {
    if (activeCall?.status !== 'ACCEPTED') return;
    if (agoraJoinedRef.current || agoraJoiningRef.current) return;
    if (agoraToken && agoraAppId && agoraChannelName) return;

    void (async () => {
      try {
        await fetchAgoraToken(conversationId, currentUserId);
      } catch (error) {
        console.error('[useDMCall] ACCEPTED fallback token refresh failed:', error);
      }
    })();
  }, [
    activeCall?.status,
    agoraAppId,
    agoraChannelName,
    agoraToken,
    conversationId,
    currentUserId,
    fetchAgoraToken,
  ]);

  // ── Subscribe WebSocket cho cuộc gọi ──────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const destination = `/topic/dm/call/${conversationId}`;
    const onCallMessage = (rawMessage: unknown) => {
      try {
        const message =
          typeof rawMessage === 'string'
            ? JSON.parse(rawMessage)
            : (rawMessage as {
                type?: string;
                callState?: DMCallState;
              });

        if (!message || typeof message !== 'object' || !message.type) {
          return;
        }

        switch (message.type) {
          case 'CALL_INCOMING':
            // Có cuộc gọi đến - kiểm tra có phải là người khác gọi mình không
            if (message.callState && message.callState.callerId !== currentUserId) {
              setIncomingCall(message.callState);
            }
            break;

          case 'CALL_ACCEPTED':
            // Bỏ qua event CALL_ACCEPTED trùng để tránh fetch token + join Agora nhiều lần.
            {
              const eventKey = [
                message.type,
                message.callState?.callId ?? '',
                message.callState?.status ?? '',
                message.callState?.startedAt ?? '',
              ].join(':');

              if (eventKey === lastAcceptedEventKeyRef.current) {
                break;
              }

              lastAcceptedEventKeyRef.current = eventKey;
            }

            // Cuộc gọi được chấp nhận - cập nhật state + lấy token + join Agora ngay (testing mode).
            updateCallState(message.callState);
            setRinging(false);
            void (async () => {
              try {
                await fetchAgoraToken(conversationId, currentUserId);
                await joinAgoraChannel();
              } catch (error) {
                console.error('[useDMCall] Failed to fetch token/join on CALL_ACCEPTED:', error);
              }
            })();
            break;

          case 'CALL_DECLINED':
          case 'CALL_ENDED':
          case 'CALL_MISSED':
            lastAcceptedEventKeyRef.current = null;
            updateCallState(message.callState);
            setRinging(false);
            // Leave Agora channel
            leaveAgoraChannel();
            // Delay clear để animation hoàn tất
            setTimeout(() => {
              clearCall();
            }, 500);
            break;

          case 'STATE_UPDATE':
            // Cập nhật trạng thái mute/deafen/camera từ người kia
            if (message.callState) {
              updateCallState(message.callState);
            }
            break;
        }
      } catch (error) {
        console.error('[useDMCall] Parse WS message error:', error);
      }
    };

    void socketService.subscribe(destination, onCallMessage);

    return () => {
      socketService.unsubscribe(destination, onCallMessage);
    };
  }, [conversationId, currentUserId, fetchAgoraToken, joinAgoraChannel, leaveAgoraChannel]);

  // ── Bắt đầu cuộc gọi voice (chỉ gọi REST, backend tự broadcast WS) ──
  const handleStartCall = useCallback(async (_callType: 'VOICE' | 'VIDEO' = 'VOICE') => {
    // Unified room model: always start as VOICE room.
    // Do not push state update immediately; backend may still be PENDING.
    const success = await startCall(conversationId, currentUserId, 'VOICE');
    return success;
  }, [conversationId, currentUserId, startCall]);

  // ── Chấp nhận cuộc gọi ──────────────────────────────────
  const handleAcceptCall = useCallback(async (_withVideo: boolean = false) => {
    const success = await acceptCall(conversationId, currentUserId);
    // Agora join will happen automatically via useEffect when call is ACCEPTED
    return success;
  }, [conversationId, currentUserId, acceptCall]);

  // ── Từ chối cuộc gọi ────────────────────────────────────
  const handleDeclineCall = useCallback(async () => {
    lastAcceptedEventKeyRef.current = null;
    const success = await declineCall(conversationId, currentUserId);
    setRinging(false);
    clearCall();
    return success;
  }, [conversationId, currentUserId, declineCall, setRinging, clearCall]);

  // ── Kết thúc cuộc gọi ───────────────────────────────────
  const handleEndCall = useCallback(async () => {
    // Leave Agora first
    await leaveAgoraChannel();
    lastAcceptedEventKeyRef.current = null;
    const success = await endCall(conversationId, currentUserId);
    setRinging(false);
    clearCall();
    return success;
  }, [conversationId, currentUserId, endCall, setRinging, clearCall, leaveAgoraChannel]);

  // ── Toggle mute (gọi REST, backend sẽ broadcast) ────────
  const handleToggleMute = useCallback(async (isMuted: boolean) => {
    const currentCall = useDMCallStore.getState().activeCall;
    if (!currentCall) return;
    if (currentCall.status !== 'ACCEPTED') return;

    // Cập nhật local state ngay
    const updatedCall: DMCallState = {
      ...currentCall,
      callerMuted: currentCall.callerId === currentUserId ? isMuted : currentCall.callerMuted,
      receiverMuted: currentCall.receiverId === currentUserId ? isMuted : currentCall.receiverMuted,
    };
    updateCallState(updatedCall);

    // Gửi lên server (server sẽ broadcast qua WS)
    const isDeafened = currentCall.callerId === currentUserId
      ? currentCall.callerDeafened
      : currentCall.receiverDeafened;
    await dmCallService.updateState(conversationId, currentUserId, isMuted, isDeafened);

    // Toggle Agora audio
    await agoraService.setAudioMuted(isMuted);
  }, [conversationId, currentUserId, updateCallState]);

  // ── Toggle deafen ───────────────────────────────────────
  const handleToggleDeafen = useCallback(async (isDeafened: boolean) => {
    const currentCall = useDMCallStore.getState().activeCall;
    if (!currentCall) return;
    if (currentCall.status !== 'ACCEPTED') return;

    // Cập nhật local state ngay
    const updatedCall: DMCallState = {
      ...currentCall,
      callerDeafened: currentCall.callerId === currentUserId ? isDeafened : currentCall.callerDeafened,
      receiverDeafened: currentCall.receiverId === currentUserId ? isDeafened : currentCall.receiverDeafened,
    };
    updateCallState(updatedCall);

    // Gửi lên server (server sẽ broadcast qua WS)
    const isMuted = currentCall.callerId === currentUserId
      ? currentCall.callerMuted
      : currentCall.receiverMuted;
    await dmCallService.updateState(conversationId, currentUserId, isMuted, isDeafened);

    // Deafen behavior:
    // - mute local microphone so others cannot hear me
    // - mute all remote playback so I cannot hear others
    await agoraService.setAudioMuted(isDeafened || isMuted);
    await agoraService.setRemoteAudioPlaybackMuted(isDeafened);
  }, [conversationId, currentUserId, updateCallState]);

  // ── Toggle camera ───────────────────────────────────────
  const handleToggleCamera = useCallback(async (isCameraOn: boolean) => {
    const currentCall = useDMCallStore.getState().activeCall;
    if (!currentCall) return;
    if (currentCall.status !== 'ACCEPTED') return;
    if (isCameraOn) {
      const hasCameraPermission = await requestCallPermissions(true);
      if (!hasCameraPermission) {
        return;
      }
    }

    // Cập nhật local state ngay
    const updatedCall: DMCallState = {
      ...currentCall,
      callerCameraOn: currentCall.callerId === currentUserId ? isCameraOn : currentCall.callerCameraOn,
      receiverCameraOn: currentCall.receiverId === currentUserId ? isCameraOn : currentCall.receiverCameraOn,
    };
    updateCallState(updatedCall);

    // Gửi lên server
    const isMuted = currentCall.callerId === currentUserId
      ? currentCall.callerMuted
      : currentCall.receiverMuted;
    const isDeafened = currentCall.callerId === currentUserId
      ? currentCall.callerDeafened
      : currentCall.receiverDeafened;
    await dmCallService.updateState(conversationId, currentUserId, isMuted, isDeafened, isCameraOn);

    // Toggle Agora video
    await agoraService.setVideoEnabled(isCameraOn);
  }, [conversationId, currentUserId, requestCallPermissions, updateCallState]);

  const handleSwitchCamera = useCallback(async () => {
    await agoraService.switchCamera();
  }, []);

  // ── Kiểm tra trạng thái ──────────────────────────────────
  const isInCall = activeCall !== null && activeCall.status === 'ACCEPTED';
  const hasIncomingCall = isRinging && activeCall?.receiverId === currentUserId;
  const isCaller = activeCall?.callerId === currentUserId;
  const isReceiver = activeCall?.receiverId === currentUserId;
  const callType = activeCall?.callType || 'VOICE';

  // ── Lấy thông tin participant ────────────────────────────
  const remoteUserId = isCaller ? activeCall?.receiverId : activeCall?.callerId;
  const remoteUserName = isCaller ? activeCall?.receiverName : activeCall?.callerName;

  // ── Initial Check (Khắc phục vào phòng trễ lỡ WS) ────────
  useEffect(() => {
    if (!conversationId) return;
    let isMounted = true;

    dmCallService.getCallStatus(conversationId).then(response => {
      if (isMounted && response.hasActiveCall && response.callState) {
        const state = response.callState;
        const currentStore = useDMCallStore.getState();

        // Nếu có cuộc gọi đang pending do người khác gọi
        if (state.status === 'PENDING' && state.callerId !== currentUserId && !currentStore.isRinging) {
          setIncomingCall(state);
        } else if (state.status === 'ACCEPTED' && !currentStore.activeCall) {
          updateCallState(state);
          fetchAgoraToken(conversationId, currentUserId);
        }
      }
    }).catch(err => console.log('Init check call status error', err));

    return () => { isMounted = false; };
  }, [conversationId, currentUserId, setIncomingCall, updateCallState, fetchAgoraToken]);

  // ── Fallback Polling ──────────────────────────────────────
  useEffect(() => {
    const needsPolling = isInCall || (isRinging && isCaller);
    if (!conversationId || !needsPolling) return;

    const interval = setInterval(async () => {
      try {
        const response = await dmCallService.getCallStatus(conversationId);
        if (response.hasActiveCall && response.callState) {
          const state = response.callState;
          if (state.status === 'ACCEPTED' && isRinging && isCaller) {
            updateCallState(state);
            fetchAgoraToken(conversationId, currentUserId);
            setRinging(false);
          } else if (state.status === 'DECLINED' || state.status === 'ENDED' || state.status === 'MISSED') {
            const currentCall = useDMCallStore.getState().activeCall;
            if (currentCall && currentCall.status !== state.status) {
              updateCallState(state);
              setRinging(false);
              leaveAgoraChannel();
              setTimeout(() => {
                clearCall();
              }, 500);
            }
          }
        } else {
             // Không có cuộc gọi => Đã dọn dẹp trên server
             const currentCall = useDMCallStore.getState().activeCall;
             if (currentCall) {
               lastAcceptedEventKeyRef.current = null;
               setRinging(false);
               leaveAgoraChannel();
               clearCall();
             }
        }
      } catch (err) {
        console.error('[useDMCall] Fallback polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId, isRinging, isCaller, isInCall, currentUserId, updateCallState, fetchAgoraToken, setRinging, clearCall, leaveAgoraChannel]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      lastAcceptedEventKeyRef.current = null;

      if (agoraJoinedRef.current) {
        leaveAgoraChannel();
      }
    };
  }, [leaveAgoraChannel]);

  return {
    // State
    activeCall,
    isConnecting,
    isRinging,
    agoraToken,
    agoraAppId,
    agoraChannelName,

    // Call status
    isInCall,
    hasIncomingCall,
    isCaller,
    isReceiver,
    remoteUserId,
    remoteUserName,
    callType,

    // Agora state
    isAgoraJoined: agoraJoinedRef.current,
    isRemoteSpeaking,
    isLocalSpeaking,

    // Actions
    handleStartCall,
    handleAcceptCall,
    handleDeclineCall,
    handleEndCall,
    handleToggleMute,
    handleToggleDeafen,
    handleToggleCamera,
    handleSwitchCamera,
    joinAgoraChannel,
    leaveAgoraChannel,
    clearCall,
  };
}
