import { useCallback, useEffect, useRef } from 'react';
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

  // ── Join Agora Channel ────────────────────────────────────────
  const joinAgoraChannel = useCallback(async () => {
    if (
      agoraToken === null ||
      !agoraAppId ||
      !agoraChannelName ||
      agoraJoinedRef.current ||
      agoraJoiningRef.current
    ) {
      return;
    }

    const enableVideo = activeCall?.callType === 'VIDEO';
    
    try {
      agoraJoiningRef.current = true;
      console.log('[useDMCall] Joining Agora channel...', { 
        appId: agoraAppId, 
        channel: agoraChannelName,
        enableVideo 
      });

      await agoraService.joinChannel(agoraAppId, agoraChannelName, agoraToken, currentUserId);
      await agoraService.startLocalTracks(enableVideo);
      
      agoraJoinedRef.current = true;
      console.log('[useDMCall] Joined Agora channel successfully');
    } catch (error) {
      console.error('[useDMCall] Failed to join Agora channel:', error);
      agoraJoinedRef.current = false;
    } finally {
      agoraJoiningRef.current = false;
    }
  }, [agoraToken, agoraAppId, agoraChannelName, activeCall?.callType, currentUserId]);

  // ── Leave Agora Channel ───────────────────────────────────────
  const leaveAgoraChannel = useCallback(async () => {
    agoraJoiningRef.current = false;

    if (agoraJoinedRef.current) {
      try {
        console.log('[useDMCall] Leaving Agora channel...');
        await agoraService.leave();
        agoraJoinedRef.current = false;
        console.log('[useDMCall] Left Agora channel');
      } catch (error) {
        console.error('[useDMCall] Error leaving Agora channel:', error);
      }
    }
  }, []);

  // ── Auto-join Agora when call is accepted ───────────────────
  useEffect(() => {
    if (activeCall?.status === 'ACCEPTED' && agoraToken !== null && agoraAppId && agoraChannelName && !agoraJoinedRef.current) {
      console.log('[useDMCall] Call accepted, auto-joining Agora...');
      joinAgoraChannel();
    }
  }, [activeCall?.status, agoraToken, agoraAppId, agoraChannelName, joinAgoraChannel]);

  // ── Subscribe WebSocket cho cuộc gọi ──────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const destination = `/topic/dm/call/${conversationId}`;

    void socketService.subscribe(destination, (rawMessage) => {
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

        console.log('[useDMCall] WS message received:', message);

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
                console.log('[useDMCall] Ignored duplicate CALL_ACCEPTED event');
                break;
              }

              lastAcceptedEventKeyRef.current = eventKey;
            }

            // Cuộc gọi được chấp nhận - cập nhật state + lấy token
            updateCallState(message.callState);
            if (!useDMCallStore.getState().agoraChannelName || !useDMCallStore.getState().agoraAppId) {
              fetchAgoraToken(conversationId, currentUserId);
            }
            setRinging(false);
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
    });

    return () => {
      socketService.unsubscribe(destination);
    };
  }, [conversationId, currentUserId, leaveAgoraChannel]);

  // ── Bắt đầu cuộc gọi voice (chỉ gọi REST, backend tự broadcast WS) ──
  const handleStartCall = useCallback(async (callType: 'VOICE' | 'VIDEO' = 'VOICE') => {
    const success = await startCall(conversationId, currentUserId, callType);
    return success;
  }, [conversationId, currentUserId, startCall]);

  // ── Chấp nhận cuộc gọi ──────────────────────────────────
  const handleAcceptCall = useCallback(async () => {
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

    // Toggle Agora audio (deafen = mute + stop playing audio)
    await agoraService.setAudioMuted(isDeafened || isMuted);
  }, [conversationId, currentUserId, updateCallState]);

  // ── Toggle camera ───────────────────────────────────────
  const handleToggleCamera = useCallback(async (isCameraOn: boolean) => {
    const currentCall = useDMCallStore.getState().activeCall;
    if (!currentCall) return;

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
    await agoraService.enableVideo(isCameraOn);
    console.log('[useDMCall] Camera toggled:', isCameraOn ? 'ON' : 'OFF');
  }, [conversationId, currentUserId, updateCallState]);

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
          console.log('[useDMCall] Init detected missed incoming call!');
          setIncomingCall(state);
        } else if (state.status === 'ACCEPTED' && !currentStore.activeCall) {
          console.log('[useDMCall] Init detected ongoing call!');
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
            console.log('[useDMCall] Fallback detected ACCEPTED state');
            updateCallState(state);
            fetchAgoraToken(conversationId, currentUserId);
            setRinging(false);
          } else if (state.status === 'DECLINED' || state.status === 'ENDED' || state.status === 'MISSED') {
            const currentCall = useDMCallStore.getState().activeCall;
            if (currentCall && currentCall.status !== state.status) {
              console.log('[useDMCall] Fallback detected ' + state.status + ' state');
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
               console.log('[useDMCall] Fallback detected no active call, clearing local state');
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

    // Actions
    handleStartCall,
    handleAcceptCall,
    handleDeclineCall,
    handleEndCall,
    handleToggleMute,
    handleToggleDeafen,
    handleToggleCamera,
    joinAgoraChannel,
    leaveAgoraChannel,
    clearCall,
  };
}
