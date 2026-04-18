import React, { memo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';

export type UserStatus = 'ONLINE' | 'IDLE' | 'DND';

interface StatusOption {
  value: UserStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'ONLINE',
    label: 'Online',
    icon: 'radio-button-on',
    color: '#3BA55C',
    description: 'Appear online to everyone',
  },
  {
    value: 'IDLE',
    label: 'Idle',
    icon: 'moon-outline',
    color: '#FAA61A',
    description: 'Appear idle after 5 minutes of inactivity',
  },
  {
    value: 'DND',
    label: 'Do Not Disturb',
    icon: 'notifications-off-outline',
    color: '#ED4245',
    description: 'Mute all notifications except mentions',
  },
];

interface StatusSelectorProps {
  currentStatus?: string;
  onSelectStatus: (status: UserStatus) => void;
}

function StatusSelectorInner({
  currentStatus,
  onSelectStatus,
}: StatusSelectorProps) {
  const [visible, setVisible] = useState(false);

  const currentOption = STATUS_OPTIONS.find(
    (opt) => opt.value === currentStatus
  ) || STATUS_OPTIONS[0];

  const handleSelect = (status: UserStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectStatus(status);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.statusDot, { backgroundColor: currentOption.color }]} />
        <ThemedText style={styles.triggerLabel}>{currentOption.label}</ThemedText>
        <Ionicons
          name="chevron-down"
          size={16}
          color={DiscordColors.textMuted}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => setVisible(false)}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.overlay}
        >
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
          <Animated.View
            entering={FadeIn.duration(250).delay(30)}
            exiting={FadeOut.duration(150)}
            style={styles.sheet}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <ThemedText style={styles.sheetTitle}>Set Status</ThemedText>

              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    currentStatus === option.value && styles.optionActive,
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionDot, { backgroundColor: option.color }]}>
                    <Ionicons
                      name={option.icon}
                      size={14}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.optionContent}>
                    <ThemedText style={styles.optionLabel}>{option.label}</ThemedText>
                    <ThemedText style={styles.optionDesc}>{option.description}</ThemedText>
                  </View>
                  {currentStatus === option.value && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={DiscordColors.blurple}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

export const StatusSelector = memo(StatusSelectorInner);

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DiscordColors.tertiaryBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  triggerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DiscordColors.textPrimary,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: DiscordColors.secondaryBackground,
    borderRadius: 12,
    minWidth: 280,
    overflow: 'hidden',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DiscordColors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
  },
  optionActive: {
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
  },
  optionDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DiscordColors.textPrimary,
  },
  optionDesc: {
    fontSize: 12,
    color: DiscordColors.textMuted,
    marginTop: 2,
  },
});
