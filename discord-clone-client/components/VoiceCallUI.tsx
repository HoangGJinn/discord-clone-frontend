import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  StatusBar,
  Pressable,
  Text,
  Platform,
  ToastAndroid,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { Avatar } from './Avatar';
import { UserAvatarWithActions } from './UserAvatarWithActions';
import { DiscordColors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import VideoRenderer from './VideoRenderer';
import { DMCallState } from '@/services/dmCallService';
import { agoraService } from '@/services/agoraService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

let RtcSurfaceView: any = null;
let VideoSourceType: any = null;
let RenderModeType: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const agora = require('react-native-agora');
    RtcSurfaceView = agora.RtcSurfaceView;
    VideoSourceType = agora.VideoSourceType;
    RenderModeType = agora.RenderModeType;
  } catch {
    // Keep nulls; UI will fall back to placeholders.
  }
}

interface VoiceCallUIProps {
  visible: boolean;
  autoStart?: boolean;
  conversationId: string;
  callType?: 'VOICE' | 'VIDEO';
  remoteUserName?: string;
  remoteUserAvatar?: string;
  remoteUserId?: string;
  remoteAvatarEffectId?: string;
  remoteBannerEffectId?: string;
  remoteCardEffectId?: string;
  onSendMessage?: () => void;
  onLeave?: () => void;
  onMinimize?: () => void;
  onAutoStartHandled?: () => void;
  activeCall: DMCallState | null;
  isInCall: boolean;
  isRemoteSpeaking: boolean;
  isLocalSpeaking: boolean;
  handleStartCall: (callType?: 'VOICE' | 'VIDEO') => Promise<boolean>;
  handleEndCall: () => Promise<boolean>;
  handleToggleMute: (isMuted: boolean) => Promise<void>;
  handleToggleDeafen: (isDeafened: boolean) => Promise<void>;
  handleToggleCamera: (isCameraOn: boolean) => Promise<void>;
  handleSwitchCamera: () => Promise<void>;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ── Animated control button ──────────────────────────────────
interface ControlButtonProps {
  icon: string;
  iconOff?: string;
  label: string;
  isActive: boolean;
  activeColor?: string;
  onPress: () => void;
  disabled?: boolean;
}

const ControlButton = memo(function ControlButton({
  icon,
  iconOff,
  label,
  isActive,
  activeColor = '#fff',
  onPress,
  disabled = false,
}: ControlButtonProps) {
  const scale = useSharedValue(1);
  const bgColor = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    bgColor.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgColor.value,
      [0, 1],
      ['#2a2a2a', activeColor]
    ),
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View
        style={[styles.controlIconCircle, animatedStyle, disabled && styles.disabledButton]}
      >
        <Ionicons
          name={(isActive && iconOff ? iconOff : icon) as any}
          size={24}
          color={isActive ? '#1a1a1a' : '#fff'}
        />
      </Animated.View>
      <ThemedText style={[styles.controlLabel, isActive && styles.controlLabelActive]}>
        {label}
      </ThemedText>
    </Pressable>
  );
});

// ── End call button ───────────────────────────────────────
interface EndCallButtonProps {
  onPress: () => void;
}

const EndCallButton = memo(function EndCallButton({ onPress }: EndCallButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.85); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onPress();
      }}
    >
      <Animated.View style={[styles.endCallBtn, animatedStyle]}>
        <Ionicons name="call" size={28} color="#fff" style={styles.endCallIcon} />
      </Animated.View>
    </Pressable>
  );
});

// ── Ring Animation for incoming call ──────────────────────
function RingAnimation({ size = 180 }: { size?: number }) {
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);
  const ring3 = useSharedValue(1);

  useEffect(() => {
    ring1.value = withRepeat(
      withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1
    );
    ring2.value = withDelay(
      400,
      withRepeat(
        withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1
      )
    );
    ring3.value = withDelay(
      800,
      withRepeat(
        withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1
      )
    );
  }, []);

  const style1 = useAnimatedStyle(() => ({ transform: [{ scale: ring1.value }], opacity: 1.5 - ring1.value }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ scale: ring2.value }], opacity: 1.5 - ring2.value }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ scale: ring3.value }], opacity: 1.5 - ring3.value }));

  return (
    <>
      <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, style1]} />
      <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, style2]} />
      <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, style3]} />
    </>
  );
}

// ── Video placeholder for web ──────────────────────────────
function VideoPlaceholder({ label }: { label: string }) {
  return (
    <View style={styles.videoPlaceholder}>
      <Ionicons name="videocam-outline" size={40} color="#666" />
      <Text style={styles.videoPlaceholderText}>{label}</Text>
    </View>
  );
}

// ── Main VoiceCallUI Component ───────────────────────────────
function VoiceCallUIInner({
  visible,
  autoStart = false,
  conversationId,
  callType: propCallType = 'VOICE',
  remoteUserName = 'Unknown',
  remoteUserAvatar,
  remoteUserId,
  remoteAvatarEffectId,
  remoteBannerEffectId,
  remoteCardEffectId,
  onSendMessage,
  onLeave,
  onMinimize,
  onAutoStartHandled,
  activeCall,
  isInCall,
  isRemoteSpeaking,
  isLocalSpeaking,
  handleStartCall,
  handleEndCall,
  handleToggleMute,
  handleToggleDeafen,
  handleToggleCamera,
  handleSwitchCamera,
}: VoiceCallUIProps) {
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id?.toString() || '0';

  // Determine effective callType: from active call or from prop
  const hasAnyCameraOn = Boolean(activeCall?.callerCameraOn || activeCall?.receiverCameraOn);

  // ── Local state ─────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(propCallType === 'VIDEO');
  const [elapsed, setElapsed] = useState(0);
  const callStartTimeRef = useRef<number>(0);
  const hasStartedCallRef = useRef(false);
  const lastEndedStatusRef = useRef<string | null>(null);
  const controlsEnabled = Boolean(activeCall && activeCall.status === 'ACCEPTED');
  const isVideoCall = propCallType === 'VIDEO' || hasAnyCameraOn || isCameraOn;

  // ── Video rendering state ────────────────────────────────
  const [remoteVideoUid, setRemoteVideoUid] = useState<number | null>(null);

  // ── Auto-start call khi modal mở (nếu chưa có cuộc gọi) ──
  useEffect(() => {
    if (visible && autoStart && !activeCall && !hasStartedCallRef.current) {
      hasStartedCallRef.current = true;
      console.log(`[VoiceCallUI] Auto-starting ${propCallType} call...`);
      handleStartCall(propCallType).finally(() => {
        onAutoStartHandled?.();
      });
      // Default camera ON for video calls
      if (propCallType === 'VIDEO') {
        setIsCameraOn(true);
      }
    }

    if (!visible) {
      hasStartedCallRef.current = false;
    }
  }, [visible, autoStart, activeCall, propCallType, handleStartCall, onAutoStartHandled]);

  // ── Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      setElapsed(0);
      setIsMuted(false);
      setIsDeafened(false);
      setIsCameraOn(false);
      return;
    }

    if (isInCall && activeCall) {
      callStartTimeRef.current = Date.now();
      const interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [visible, isInCall]);

  useEffect(() => {
    if (!activeCall) return;
    const isCurrentUserCaller = String(activeCall.callerId || '') === currentUserId;
    const myMutedState = isCurrentUserCaller ? activeCall.callerMuted : activeCall.receiverMuted;
    const myDeafenedState = isCurrentUserCaller
      ? activeCall.callerDeafened
      : activeCall.receiverDeafened;
    const myCameraState =
      isCurrentUserCaller
        ? activeCall.callerCameraOn
        : activeCall.receiverCameraOn;
    setIsMuted(Boolean(myMutedState));
    setIsDeafened(Boolean(myDeafenedState));
    if (typeof myCameraState === 'boolean') {
      setIsCameraOn(myCameraState);
    }
  }, [activeCall, currentUserId]);

  const isCurrentUserCaller = String(activeCall?.callerId || '') === currentUserId;
  const remoteMuted = Boolean(
    activeCall ? (isCurrentUserCaller ? activeCall.receiverMuted : activeCall.callerMuted) : false
  );
  const remoteDeafened = Boolean(
    activeCall ? (isCurrentUserCaller ? activeCall.receiverDeafened : activeCall.callerDeafened) : false
  );
  const remoteCameraOn = Boolean(
    activeCall ? (isCurrentUserCaller ? activeCall.receiverCameraOn : activeCall.callerCameraOn) : false
  );
  const isDualCameraActive = Boolean(isCameraOn && remoteCameraOn);
  const shouldShowLocalMain = isCameraOn;
  const shouldShowRemoteMain = !shouldShowLocalMain && remoteCameraOn;

  // ── Auto-dismiss khi cuộc gọi kết thúc ─────────────────
  useEffect(() => {
    if (visible && activeCall && (activeCall.status === 'ENDED' || activeCall.status === 'DECLINED' || activeCall.status === 'MISSED')) {
      if (lastEndedStatusRef.current !== activeCall.status) {
        lastEndedStatusRef.current = activeCall.status;
        const message = 'Call ended. Returning to chat...';
        if (Platform.OS === 'android') {
          ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
          Alert.alert('Call ended', message);
        }
      }
      const timer = setTimeout(() => {
        onLeave?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (!activeCall || activeCall.status === 'ACCEPTED' || activeCall.status === 'PENDING') {
      lastEndedStatusRef.current = null;
    }
  }, [visible, activeCall, onLeave]);

  // ── Handlers ────────────────────────────────────────────
  const handleToggleMuteLocal = useCallback(() => {
    const newValue = !isMuted;
    setIsMuted(newValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleToggleMute(newValue);
  }, [isMuted, handleToggleMute]);

  const handleToggleDeafenLocal = useCallback(() => {
    const newValue = !isDeafened;
    setIsDeafened(newValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleToggleDeafen(newValue);
  }, [isDeafened, handleToggleDeafen]);

  const handleToggleCameraLocal = useCallback(() => {
    const newValue = !isCameraOn;
    setIsCameraOn(newValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleToggleCamera(newValue);
    console.log('[Call] Camera toggled:', newValue ? 'ON' : 'OFF');
  }, [isCameraOn, handleToggleCamera]);

  const handleLeave = useCallback(() => {
    handleEndCall();
    onLeave?.();
  }, [handleEndCall, onLeave]);

  const handleMinimize = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMinimize?.();
  }, [onMinimize]);

  // ── Speaking pulse ───────────────────────────────────────
  const livePulse = useSharedValue(1);
  useEffect(() => {
    livePulse.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: livePulse.value }));

  useEffect(() => {
    if (!visible) return;
    agoraService.onRemoteVideo((uid) => {
      const parsedUid = Number(uid);
      if (Number.isFinite(parsedUid)) {
        setRemoteVideoUid(parsedUid);
      }
    });
    agoraService.onRemoteVideoRemoved(() => {
      setRemoteVideoUid(null);
    });
    return () => {
      agoraService.onRemoteVideo(() => undefined);
      agoraService.onRemoteVideoRemoved(() => undefined);
      setRemoteVideoUid(null);
    };
  }, [visible]);

  // Incoming/outgoing ringing overlays are removed in DM call flow.

  // ── Render: Active Call ───────────────────────────────────
  // Video call layout with video streams
  if (isVideoCall) {
    return (
      <Modal visible={visible || isInCall} transparent animationType="none" onRequestClose={handleLeave}>
        <View style={styles.modalBackdrop}>
          <StatusBar barStyle="light-content" />
          <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.videoContainer}>
            {/* Status Bar */}
            <View style={styles.statusBar}>
              <TouchableOpacity style={styles.minimizeBtn} onPress={handleMinimize} activeOpacity={0.7}>
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </TouchableOpacity>

              <View style={styles.statusCenter}>
                <ThemedText style={styles.channelLabel}>{remoteUserName}</ThemedText>
                {activeCall?.status === 'PENDING' ? (
                  <ThemedText style={styles.waitingText}>Waiting for other user to join...</ThemedText>
                ) : null}
                <View style={styles.timerBadge}>
                  <Ionicons name="time-outline" size={12} color="#fff" />
                  <ThemedText style={styles.timerText}>{formatDuration(elapsed)}</ThemedText>
                </View>
              </View>

              <View style={[styles.statusDot, isInCall && styles.statusDotActive]} />
            </View>
            {isCameraOn && controlsEnabled ? (
              <TouchableOpacity style={styles.topRightFlipBtn} onPress={handleSwitchCamera} activeOpacity={0.8}>
                <Ionicons name="camera-reverse-outline" size={18} color="#fff" />
              </TouchableOpacity>
            ) : null}

            {/* Main Video Area */}
            <View style={styles.videoMainArea}>
              {/* Remote Video / Avatar */}
              <View style={styles.remoteVideoCard}>
                {shouldShowLocalMain && RtcSurfaceView && Platform.OS !== 'web' ? (
                  <RtcSurfaceView
                    style={styles.remoteVideo}
                    canvas={{
                      uid: 0,
                      sourceType: VideoSourceType?.VideoSourceCameraPrimary,
                      renderMode: RenderModeType?.RenderModeHidden,
                    }}
                  />
                ) : shouldShowRemoteMain && RtcSurfaceView && remoteVideoUid !== null ? (
                  <RtcSurfaceView
                    style={styles.remoteVideo}
                    canvas={{
                      uid: remoteVideoUid,
                      renderMode: RenderModeType?.RenderModeHidden,
                    }}
                  />
                ) : (
                  <View style={styles.remoteVideoPlaceholder}>
                    <UserAvatarWithActions
                      user={{
                        id: remoteUserId || '',
                        username: remoteUserName,
                        displayName: remoteUserName,
                        avatar: remoteUserAvatar,
                        avatarEffectId: remoteAvatarEffectId,
                        bannerEffectId: remoteBannerEffectId,
                        cardEffectId: remoteCardEffectId,
                      }}
                      size={120}
                    />
                    {isInCall && isRemoteSpeaking && <Animated.View style={[styles.speakingGlow, pulseStyle]} />}
                  </View>
                )}
                <View style={styles.remoteVideoInfo}>
                  <ThemedText style={styles.remoteVideoName}>
                    {shouldShowLocalMain ? (currentUser?.displayName || 'You') : remoteUserName}
                  </ThemedText>
                  <View style={styles.remoteIndicators}>
                    {(shouldShowLocalMain ? isCameraOn : remoteCameraOn) && (
                      <View style={[styles.indicatorBadge, styles.cameraBadge]}>
                        <Ionicons name="videocam" size={12} color="#fff" />
                      </View>
                    )}
                    {(shouldShowLocalMain ? isMuted : remoteMuted) && (
                      <View style={styles.indicatorBadge}>
                        <Ionicons name="mic-off" size={12} color="#fff" />
                      </View>
                    )}
                    {(shouldShowLocalMain ? isDeafened : remoteDeafened) && (
                      <View style={[styles.indicatorBadge, styles.deafenBadge]}>
                        <Ionicons name="headset" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Local Video Preview (Picture-in-Picture) */}
              <View style={[styles.localVideoPip, isDualCameraActive && styles.localVideoPipDual]}>
                {shouldShowLocalMain ? (
                  remoteCameraOn && RtcSurfaceView && remoteVideoUid !== null ? (
                    <RtcSurfaceView
                      style={styles.remoteVideo}
                      canvas={{
                        uid: remoteVideoUid,
                        renderMode: RenderModeType?.RenderModeHidden,
                      }}
                    />
                  ) : (
                    <View style={styles.localVideoOff}>
                      <UserAvatarWithActions
                        user={{
                          id: remoteUserId || '',
                          username: remoteUserName,
                          displayName: remoteUserName,
                          avatar: remoteUserAvatar,
                          avatarEffectId: remoteAvatarEffectId,
                          bannerEffectId: remoteBannerEffectId,
                          cardEffectId: remoteCardEffectId,
                        }}
                        size={60}
                        disabled={true}
                      />
                    </View>
                  )
                ) : (
                  isCameraOn && RtcSurfaceView && Platform.OS !== 'web' ? (
                    <RtcSurfaceView
                      style={styles.remoteVideo}
                      canvas={{
                        uid: 0,
                        sourceType: VideoSourceType?.VideoSourceCameraPrimary,
                        renderMode: RenderModeType?.RenderModeHidden,
                      }}
                    />
                  ) : (
                    <View style={styles.localVideoOff}>
                      <UserAvatarWithActions
                        user={currentUser!}
                        size={60}
                        disabled={true}
                      />
                    </View>
                  )
                )}
                {/* Camera toggle button on PIP */}
                <TouchableOpacity
                  style={styles.pipCameraToggle}
                  onPress={handleToggleCameraLocal}
                >
                  <Ionicons
                    name={isCameraOn ? 'videocam' : 'videocam-off'}
                    size={16}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Control Bar */}
            <View style={styles.controlBar}>
              <View style={styles.controlButtons}>
                {/* Camera Toggle */}
                <ControlButton
                  icon="videocam"
                  iconOff="videocam-off"
                  label={isCameraOn ? 'Cam Off' : 'Cam On'}
                  isActive={isCameraOn}
                  onPress={handleToggleCameraLocal}
                  disabled={!controlsEnabled}
                />
                {/* Mic Toggle */}
                <ControlButton
                  icon="mic"
                  iconOff="mic-off"
                  label={isMuted ? 'Unmute' : 'Mute'}
                  isActive={isMuted}
                  onPress={handleToggleMuteLocal}
                  disabled={!controlsEnabled}
                />
                {/* Deafen Toggle */}
                <ControlButton
                  icon="headset-outline"
                  iconOff="headset"
                  label={isDeafened ? 'Undeafen' : 'Deafen'}
                  isActive={isDeafened}
                  onPress={handleToggleDeafenLocal}
                  disabled={!controlsEnabled}
                />
              </View>
              <EndCallButton onPress={handleLeave} />
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Voice call layout (original)
  return (
    <Modal visible={visible || isInCall} transparent animationType="none" onRequestClose={handleLeave}>
      <View style={styles.modalBackdrop}>
        <StatusBar barStyle="light-content" />
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.container}>
          {/* Status Bar */}
          <View style={styles.statusBar}>
            <TouchableOpacity style={styles.minimizeBtn} onPress={handleMinimize} activeOpacity={0.7}>
              <Ionicons name="chevron-down" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.statusCenter}>
              <ThemedText style={styles.channelLabel}>{remoteUserName}</ThemedText>
                {activeCall?.status === 'PENDING' ? (
                  <ThemedText style={styles.waitingText}>Waiting for other user to join...</ThemedText>
                ) : null}
              <View style={styles.timerBadge}>
                <Ionicons name="time-outline" size={12} color="#fff" />
                <ThemedText style={styles.timerText}>{formatDuration(elapsed)}</ThemedText>
              </View>
            </View>

            <View style={[styles.statusDot, isInCall && styles.statusDotActive]} />
          </View>
          {isCameraOn && controlsEnabled ? (
            <TouchableOpacity style={styles.topRightFlipBtn} onPress={handleSwitchCamera} activeOpacity={0.8}>
              <Ionicons name="camera-reverse-outline" size={18} color="#fff" />
            </TouchableOpacity>
          ) : null}

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Remote User */}
            <View style={styles.remoteCard}>
              <View style={styles.remoteVideoArea}>
                <View style={styles.remoteBg}>
                  {remoteUserId ? (
                    <UserAvatarWithActions
                      user={{
                        id: remoteUserId,
                        username: remoteUserName,
                        displayName: remoteUserName,
                        avatar: remoteUserAvatar,
                        avatarEffectId: remoteAvatarEffectId,
                        bannerEffectId: remoteBannerEffectId,
                        cardEffectId: remoteCardEffectId,
                      }}
                      size={140}
                    />
                  ) : (
                    <Avatar name={remoteUserName} uri={remoteUserAvatar} size={140} />
                  )}
                </View>
                {isInCall && isRemoteSpeaking && <Animated.View style={[styles.speakingGlow, pulseStyle]} />}
                <View style={styles.remoteUserInfo}>
                  <ThemedText style={styles.remoteUsername}>{remoteUserName}</ThemedText>
                  <View style={styles.remoteIndicators}>
                    {remoteCameraOn && (
                      <View style={[styles.indicatorBadge, styles.cameraBadge]}>
                        <Ionicons name="videocam" size={12} color="#fff" />
                      </View>
                    )}
                    {remoteMuted && (
                      <View style={styles.indicatorBadge}>
                        <Ionicons name="mic-off" size={12} color="#fff" />
                      </View>
                    )}
                    {remoteDeafened && (
                      <View style={[styles.indicatorBadge, styles.deafenBadge]}>
                        <Ionicons name="headset" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Self View */}
            <View style={styles.selfCard}>
              <View style={styles.selfVideoArea}>
                <View style={styles.selfBg}>
                  <View style={styles.selfAvatarContainer}>
                    <UserAvatarWithActions
                      user={currentUser!}
                      size={80}
                      disabled={true}
                    />
                  </View>
                </View>

                <View style={styles.selfUserInfo}>
                  <ThemedText style={styles.selfUsername}>{currentUser?.displayName || 'You'}</ThemedText>
                </View>
                <View style={styles.selfIndicators}>
                  {isCameraOn && (
                    <View style={[styles.indicatorBadge, styles.cameraBadge]}>
                      <Ionicons name="videocam" size={12} color="#fff" />
                    </View>
                  )}
                  {isInCall && isLocalSpeaking && (
                    <View style={[styles.indicatorBadge, styles.speakingBadge]}>
                      <Ionicons name="radio" size={12} color="#fff" />
                    </View>
                  )}
                  {isMuted && (
                    <View style={styles.indicatorBadge}>
                      <Ionicons name="mic-off" size={12} color="#fff" />
                    </View>
                  )}
                  {isDeafened && (
                    <View style={[styles.indicatorBadge, styles.deafenBadge]}>
                      <Ionicons name="headset" size={12} color="#fff" />
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Control Bar */}
          <View style={styles.controlBar}>
            <View style={styles.controlButtons}>
              {/* Camera Toggle */}
              <ControlButton
                icon="videocam"
                iconOff="videocam-off"
                label={isCameraOn ? 'Cam Off' : 'Cam On'}
                isActive={isCameraOn}
                onPress={handleToggleCameraLocal}
                disabled={!controlsEnabled}
              />
              {/* Mic Toggle */}
              <ControlButton
                icon="mic"
                iconOff="mic-off"
                label={isMuted ? 'Unmute' : 'Mute'}
                isActive={isMuted}
                onPress={handleToggleMuteLocal}
                disabled={!controlsEnabled}
              />
              {/* Deafen Toggle */}
              <ControlButton
                icon="headset-outline"
                iconOff="headset"
                label={isDeafened ? 'Undeafen' : 'Deafen'}
                isActive={isDeafened}
                onPress={handleToggleDeafenLocal}
                disabled={!controlsEnabled}
              />
            </View>
            <EndCallButton onPress={handleLeave} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export const VoiceCallUI = memo(VoiceCallUIInner);

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0f',
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0f',
  },
  connectingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  connectingAvatar: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectingText: {
    position: 'absolute',
    bottom: 160,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  connectingName: {
    position: 'absolute',
    bottom: 130,
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  cancelBtn: {
    position: 'absolute',
    bottom: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  incomingAvatar: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingTitle: {
    position: 'absolute',
    bottom: 160,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  incomingName: {
    position: 'absolute',
    bottom: 130,
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  incomingActions: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 50,
  },
  declineBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#34c759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(88, 166, 255, 0.5)',
    backgroundColor: 'transparent',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 50,
    paddingBottom: Spacing.md,
  },
  minimizeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCenter: {
    alignItems: 'center',
  },
  channelLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  waitingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#666',
  },
  statusDotActive: {
    backgroundColor: '#34c759',
  },
  topRightFlipBtn: {
    position: 'absolute',
    top: 92,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  // Video layout styles
  videoMainArea: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    position: 'relative',
  },
  remoteVideoCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  remoteVideoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  remoteVideoInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  remoteVideoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  localVideoPip: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 120,
    height: 160,
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#444',
  },
  localVideoPipDual: {
    width: 140,
    height: 190,
    borderColor: '#666',
  },
  localVideoOff: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipCameraToggle: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  // Voice layout styles
  mainContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    justifyContent: 'space-between',
  },
  remoteCard: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  remoteVideoArea: {
    flex: 1,
    backgroundColor: '#1a237e',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  remoteBg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakingGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(88, 166, 255, 0.5)',
  },
  remoteUserInfo: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  remoteIndicators: {
    marginTop: Spacing.xs,
    flexDirection: 'row',
    gap: 4,
  },
  remoteUsername: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  selfCard: {
    height: 180,
  },
  selfVideoArea: {
    height: '100%',
    backgroundColor: '#121212',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  selfBg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selfAvatarBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DiscordColors.blurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfAvatarBgMuted: {
    backgroundColor: '#ff3b30',
  },
  selfRing: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selfUserInfo: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  selfUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a0a0a0',
  },
  selfIndicators: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    gap: 4,
  },
  indicatorBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  deafenBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
  },
  speakingBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
  cameraBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
    paddingBottom: 40,
    backgroundColor: '#0a0a0f',
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-around',
  },
  controlIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a0a0a0',
    textAlign: 'center',
  },
  controlLabelActive: {
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  endCallIcon: {
    transform: [{ rotate: '135deg' }],
  },
});
