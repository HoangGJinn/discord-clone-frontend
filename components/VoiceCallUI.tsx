import React, { memo, useState, useEffect } from 'react';
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
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { Avatar } from './Avatar';
import { DiscordColors, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking?: boolean;
  isVideoEnabled?: boolean;
}

interface VoiceCallUIProps {
  visible: boolean;
  channelName: string;
  participants: Participant[];
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking?: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleVideo?: () => void;
  onSendMessage?: () => void;
  onLeave: () => void;
  duration?: number;
  currentUserName?: string;
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

function VoiceCallUIInner({
  visible,
  channelName,
  participants,
  isMuted,
  isDeafened,
  isSpeaking = false,
  onToggleMute,
  onToggleDeafen,
  onToggleVideo,
  onSendMessage,
  onLeave,
  duration = 0,
  currentUserName = 'You',
}: VoiceCallUIProps) {
  const [elapsed, setElapsed] = useState(duration);

  useEffect(() => {
    if (!visible) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const livePulse = useSharedValue(1);

  useEffect(() => {
    livePulse.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: livePulse.value,
  }));

  // Get main participant (first one)
  const mainParticipant = participants[0];
  const mainName = mainParticipant?.name || 'mfun';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onLeave}
    >
      <View style={styles.modalBackdrop}>
        <StatusBar barStyle="light-content" />
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.container}
        >
          {/* ─── Top Status Bar ─── */}
          <View style={styles.statusBar}>
            <View style={styles.statusLeft}>
              <Ionicons name="chevron-down" size={16} color="#fff" />
              <ThemedText style={styles.channelLabel}>
                {mainName}
              </ThemedText>
            </View>
          </View>

          {/* ─── Main Content ─── */}
          <View style={styles.mainContent}>
            {/* ─── Remote Participant (Top) - Large Card ─── */}
            <View style={styles.remoteCard}>
              <View style={styles.remoteVideoArea}>
                {/* Deep blue background with avatar */}
                <View style={styles.remoteBg}>
                  <Avatar
                    name={mainName}
                    uri={mainParticipant?.avatar}
                    size={140}
                  />
                </View>

                {/* Speaking indicator - subtle glow */}
                {mainParticipant?.isSpeaking && (
                  <Animated.View style={[styles.speakingGlow, pulseStyle]} />
                )}

                {/* Username below avatar */}
                <View style={styles.remoteUserInfo}>
                  <ThemedText style={styles.remoteUsername}>
                    {mainName}
                  </ThemedText>
                </View>

                {/* Muted indicator */}
                {mainParticipant?.isMuted && (
                  <View style={styles.mutedIndicator}>
                    <Ionicons name="mic-off" size={16} color="#fff" />
                  </View>
                )}
              </View>
            </View>

            {/* ─── Current User (Bottom) - Small Card ─── */}
            <View style={styles.selfCard}>
              <View style={styles.selfVideoArea}>
                {/* Black/dark background with avatar */}
                <View style={styles.selfBg}>
                  <View style={styles.selfAvatarContainer}>
                    <View style={styles.selfAvatarBg}>
                      <Ionicons name="person" size={48} color="#fff" />
                    </View>
                    {/* Self indicator ring */}
                    <View style={styles.selfRing} />
                  </View>
                </View>

                {/* Username below */}
                <View style={styles.selfUserInfo}>
                  <ThemedText style={styles.selfUsername}>
                    {currentUserName}
                  </ThemedText>
                </View>

                {/* Muted indicator */}
                {isMuted && (
                  <View style={styles.selfMutedIndicator}>
                    <Ionicons name="mic-off" size={14} color="#fff" />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ─── Control Bar ─── */}
          <View style={styles.controlBar}>
            <View style={styles.controlButtons}>
              {/* Camera Off */}
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggleVideo?.();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.controlIconCircle}>
                  <Ionicons
                    name="videocam-off-outline"
                    size={24}
                    color="#fff"
                  />
                </View>
                <ThemedText style={styles.controlLabel}>Camera</ThemedText>
              </TouchableOpacity>

              {/* Microphone */}
              <TouchableOpacity
                style={[styles.controlBtn]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onToggleMute();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.controlIconCircle, isMuted && styles.controlIconMuted]}>
                  <Ionicons
                    name={isMuted ? 'mic-off' : 'mic'}
                    size={24}
                    color={isMuted ? '#1a1a1a' : '#fff'}
                  />
                </View>
                <ThemedText style={[styles.controlLabel, isMuted && styles.controlLabelMuted]}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </ThemedText>
              </TouchableOpacity>

              {/* Message */}
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSendMessage?.();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.controlIconCircle}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={24}
                    color="#fff"
                  />
                </View>
                <ThemedText style={styles.controlLabel}>Message</ThemedText>
              </TouchableOpacity>

              {/* Effects / Settings */}
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.controlIconCircle}>
                  <Ionicons
                    name="options-outline"
                    size={24}
                    color="#fff"
                  />
                </View>
                <ThemedText style={styles.controlLabel}>Effects</ThemedText>
              </TouchableOpacity>
            </View>

            {/* End Call Button */}
            <TouchableOpacity
              style={styles.endCallBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onLeave();
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="call"
                size={28}
                color="#fff"
                style={styles.endCallIcon}
              />
            </TouchableOpacity>
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 50,
    paddingBottom: Spacing.md,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  batteryBody: {
    width: 22,
    height: 11,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#fff',
    padding: 1,
  },
  batteryLevel: {
    width: '70%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  batteryTip: {
    width: 2,
    height: 5,
    backgroundColor: '#fff',
    marginLeft: 1,
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
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
    borderColor: 'rgba(33, 150, 243, 0.4)',
  },
  remoteUserInfo: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  remoteUsername: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  mutedIndicator: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    borderRadius: 20,
    padding: 8,
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
  selfMutedIndicator: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    borderRadius: 14,
    padding: 6,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
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
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
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
  controlIconMuted: {
    backgroundColor: '#fff',
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a0a0a0',
  },
  controlLabelMuted: {
    color: '#fff',
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
