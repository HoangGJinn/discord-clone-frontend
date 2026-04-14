import { useCallback, useEffect, useRef } from 'react';
import { dmCallService, DMCallState } from '@/services/dmCallService';
import { useDMCallStore } from '@/store/useDMCallStore';
import socketService from '@/services/socketService';

/**
 * Hook quản lý DM Voice Call
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

  // ── Subscribe WebSocket cho cuộc gọi ──────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const destination = `/topic/dm/call/${conversationId}`;

    const subscription = socketService.subscribe(destination, (frame) => {
      try {
        const message = JSON.parse(frame.body);
        console.log('[useDMCall] WS message received:', message);

        switch (message.type) {
          case 'CALL_INCOMING':
            // Có cuộc gọi đến - kiểm tra có phải là người khác gọi mỉnh không
            if (message.callState && message.callState.callerId !== currentUserId) {
              setIncomingCall(message.callState);
            }
            break;

          case 'CALL_ACCEPTED':
            // Cuộc gọi được chấp nhận - cập nhật state + lấy token
            updateCallState(message.callState);
            fetchAgoraToken(conversationId, currentUserId);
            setRinging(false);
            break;

          case 'CALL_DECLINED':
          case 'CALL_ENDED':
          case 'CALL_MISSED':
            updateCallState(message.callState);
            setRinging(false);
            // Delay clear để animation hoàn tất
            setTimeout(() => {
              clearCall();
            }, 500);
            break;

          case 'STATE_UPDATE':
            // Cập nhật trạng thái mute/deafen từ người kia
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
  }, [conversationId, currentUserId]);

  // ── Bắt đầu cuộc gọi (chỉ gọi REST, backend tự broadcast WS) ──
  const handleStartCall = useCallback(async () => {
    const success = await startCall(conversationId, currentUserId);
    return success;
  }, [conversationId, currentUserId, startCall]);

  // ── Chấp nhận cuộc gọi ──────────────────────────────────
  const handleAcceptCall = useCallback(async () => {
    const success = await acceptCall(conversationId, currentUserId);
    return success;
  }, [conversationId, currentUserId, acceptCall]);

  // ── Từ chối cuộc gọi ────────────────────────────────────
  const handleDeclineCall = useCallback(async () => {
    const success = await declineCall(conversationId, currentUserId);
    setRinging(false);
    clearCall();
    return success;
  }, [conversationId, currentUserId, declineCall, setRinging, clearCall]);

  // ── Kết thúc cuộc gọi ───────────────────────────────────
  const handleEndCall = useCallback(async () => {
    const success = await endCall(conversationId, currentUserId);
    setRinging(false);
    clearCall();
    return success;
  }, [conversationId, currentUserId, endCall, setRinging, clearCall]);

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
  }, [conversationId, currentUserId, updateCallState]);

  // ── Kiểm tra trạng thái ──────────────────────────────────
  const isInCall = activeCall !== null && activeCall.status === 'ACCEPTED';
  const hasIncomingCall = isRinging && activeCall?.receiverId === currentUserId;
  const isCaller = activeCall?.callerId === currentUserId;
  const isReceiver = activeCall?.receiverId === currentUserId;

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
  // Đảm bảo caller không bị kẹt ở "Calling..." và receiver không kẹt lúc "Active" 
  // nếu lỡ mất WebSocket message
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
               setRinging(false);
               clearCall();
             }
        }
      } catch (err) {
        console.error('[useDMCall] Fallback polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId, isRinging, isCaller, isInCall, currentUserId, updateCallState, fetchAgoraToken, setRinging, clearCall]);

  return {
    // State
    activeCall,
    isConnecting,
    isRinging,
    agoraToken,
    agoraAppId,

    // Call status
    isInCall,
    hasIncomingCall,
    isCaller,
    isReceiver,
    remoteUserId,
    remoteUserName,

    // Actions
    handleStartCall,
    handleAcceptCall,
    handleDeclineCall,
    handleEndCall,
    handleToggleMute,
    handleToggleDeafen,
    clearCall,
  };
}
