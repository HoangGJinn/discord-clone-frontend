import React, { memo, useCallback, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from './themed-text';
import { Avatar } from './Avatar';
import { DiscordColors, Spacing } from '@/constants/theme';
import { useGlobalCallStore } from '@/store/useGlobalCallStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useDMCallStore } from '@/store/useDMCallStore';
import { dmCallService } from '@/services/dmCallService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Ring Animation ───────────────────────────────────────────
function RingAnimation({ size = 140 }: { size?: number }) {
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

  const style1 = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: 1.5 - ring1.value,
  }));
  const style2 = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: 1.5 - ring2.value,
  }));
  const style3 = useAnimatedStyle(() => ({
    transform: [{ scale: ring3.value }],
    opacity: 1.5 - ring3.value,
  }));

  return (
    <>
      <Animated.View
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, style1]}
      />
      <Animated.View
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, style2]}
      />
      <Animated.View
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, style3]}
      />
    </>
  );
}

// ── Main Component ───────────────────────────────────────────
function IncomingCallOverlayInner() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id?.toString() || '0';

  const { incomingCall, isVisible, hideIncoming, clearIncoming } = useGlobalCallStore();
  const { setIncomingCall } = useDMCallStore();

  // Xác định thông tin caller
  const callerName = incomingCall?.callerName || 'Unknown';
  const callerAvatar = incomingCall?.callerAvatar;
  const callType = incomingCall?.callType || 'VOICE';
  const conversationId = incomingCall?.conversationId || '';
  const isVideoCall = callType === 'VIDEO';

  // ── Accept ──────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!incomingCall || !conversationId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Đặt incoming call vào DMCallStore để VoiceCallUI xử lý
    setIncomingCall(incomingCall);
    clearIncoming();

    // Accept call qua REST
    try {
      await dmCallService.acceptCall(conversationId, currentUserId);
    } catch (err) {
      console.error('[IncomingCallOverlay] Accept call error:', err);
    }

    // Navigate đến DM conversation
    router.push(`/dm/${conversationId}`);
  }, [incomingCall, conversationId, currentUserId, setIncomingCall, clearIncoming, router]);

  // ── Decline ─────────────────────────────────────────────
  const handleDecline = useCallback(async () => {
    if (!conversationId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearIncoming();

    try {
      await dmCallService.declineCall(conversationId, currentUserId);
    } catch (err) {
      console.error('[IncomingCallOverlay] Decline call error:', err);
    }
  }, [conversationId, currentUserId, clearIncoming]);

  // Không hiện nếu không có incoming call hoặc đã ẩn
  if (!isVisible || !incomingCall) return null;

  // Chỉ hiện cho receiver (không phải caller)
  if (incomingCall.callerId === currentUserId) return null;

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.backdrop}>
        <StatusBar barStyle="light-content" />
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.container}
        >
          {/* Background gradient effect */}
          <View style={styles.bgGradient} />

          {/* Ring animation + Avatar */}
          <View style={styles.avatarContainer}>
            <RingAnimation size={160} />
            <View style={styles.avatarWrapper}>
              <Avatar name={callerName} uri={callerAvatar} size={100} />
            </View>
          </View>

          {/* Call info */}
          <View style={styles.infoContainer}>
            <ThemedText style={styles.callTypeLabel}>
              {isVideoCall ? 'Incoming Video Call' : 'Incoming Voice Call'}
            </ThemedText>
            <ThemedText style={styles.callerName}>{callerName}</ThemedText>
            <View style={styles.callTypeBadge}>
              <Ionicons
                name={isVideoCall ? 'videocam' : 'call'}
                size={14}
                color="#fff"
              />
              <ThemedText style={styles.callTypeBadgeText}>
                {isVideoCall ? 'Video' : 'Voice'}
              </ThemedText>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {/* Decline */}
            <View style={styles.actionItem}>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
                <Ionicons
                  name="call"
                  size={28}
                  color="#fff"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
              </TouchableOpacity>
              <ThemedText style={styles.actionLabel}>Decline</ThemedText>
            </View>

            {/* Accept */}
            <View style={styles.actionItem}>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                <Ionicons
                  name={isVideoCall ? 'videocam' : 'call'}
                  size={32}
                  color="#fff"
                />
              </TouchableOpacity>
              <ThemedText style={styles.actionLabel}>Accept</ThemedText>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export const IncomingCallOverlay = memo(IncomingCallOverlayInner);

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a1a',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  avatarWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(88, 166, 255, 0.4)',
    backgroundColor: 'transparent',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  callTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  callerName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  callTypeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 80,
  },
  actionItem: {
    alignItems: 'center',
    gap: 10,
  },
  declineBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#34c759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34c759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
