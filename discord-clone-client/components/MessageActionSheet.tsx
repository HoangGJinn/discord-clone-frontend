import React, { memo } from 'react';
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
      <Animated.View 
        entering={FadeIn.duration(200)} 
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View 
          entering={FadeIn.duration(250).delay(30)}
          exiting={FadeOut.duration(150)}
          style={styles.sheet}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Quick reaction emojis */}
            {onQuickReact && (
              <>
                <View style={styles.emojiRow}>
                  {QUICK_REACTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.emojiBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onQuickReact(emoji);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={styles.emojiText}>{emoji}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Action items */}
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  action.onPress();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={action.icon}
                  size={18}
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
      </Animated.View>
    </Modal>
  );
}

export const MessageActionSheet = memo(MessageActionSheetInner);

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
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
    borderRadius: 6,
    minWidth: 220,
    overflow: 'hidden',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  divider: {
    height: 1,
    backgroundColor: DiscordColors.divider,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  actionIcon: {
    marginRight: 10,
    width: 20,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: DiscordColors.textPrimary,
  },
});
