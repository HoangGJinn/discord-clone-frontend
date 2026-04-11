import React, { memo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import Animated, { SlideInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { QUICK_REACTIONS } from '@/constants/emojis';

// ─── Props ───────────────────────────────────────────────────
interface MessageAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}

interface MessageActionSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: MessageAction[];
  /** Quick-react emoji row */
  onQuickReact?: (emoji: string) => void;
}

// ─── Component ───────────────────────────────────────────────
function MessageActionSheetInner({
  visible,
  onClose,
  actions,
  onQuickReact,
}: MessageActionSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          style={styles.sheet}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={styles.handle} />

            {/* Quick reaction row */}
            {onQuickReact && (
              <View style={styles.quickReactRow}>
                {QUICK_REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.quickReactBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onQuickReact(emoji);
                      onClose();
                    }}
                    activeOpacity={0.6}
                  >
                    <ThemedText style={styles.quickReactEmoji}>
                      {emoji}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Action items */}
            {actions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionItem,
                  index === actions.length - 1 && styles.lastItem,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  action.onPress();
                  onClose();
                }}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={action.icon}
                  size={20}
                  color={action.color || DiscordColors.textSecondary}
                  style={styles.actionIcon}
                />
                <ThemedText
                  style={[
                    styles.actionLabel,
                    action.color ? { color: action.color } : null,
                  ]}
                >
                  {action.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export const MessageActionSheet = memo(MessageActionSheetInner);

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: DiscordColors.secondaryBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34, // Safe area
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: DiscordColors.textMuted,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  quickReactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  quickReactBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickReactEmoji: {
    fontSize: 24,
  },
  divider: {
    height: 1,
    backgroundColor: DiscordColors.divider,
    marginHorizontal: Spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  lastItem: {
    marginBottom: 0,
  },
  actionIcon: {
    marginRight: Spacing.md,
    width: 24,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: DiscordColors.textPrimary,
  },
});
