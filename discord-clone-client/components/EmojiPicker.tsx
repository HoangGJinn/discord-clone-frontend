import React, { memo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, { SlideInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import {
  QUICK_EMOJIS,
  EMOJI_CATEGORIES,
  EMOJI_CATEGORY_NAMES,
} from '@/constants/emojis';

// ─── Props ───────────────────────────────────────────────────
interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

// ─── Component ───────────────────────────────────────────────
function EmojiPickerInner({ visible, onClose, onSelectEmoji }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState('Smileys');

  const handleSelect = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectEmoji(emoji);
    onClose();
  };

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
          style={styles.container}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Quick-pick row */}
            <View style={styles.quickRow}>
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.quickEmoji}
                  onPress={() => handleSelect(emoji)}
                  activeOpacity={0.6}
                >
                  <ThemedText style={styles.emojiText}>{emoji}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Category tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabs}
            >
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryTab,
                    activeCategory === cat && styles.categoryTabActive,
                  ]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <ThemedText
                    style={[
                      styles.categoryText,
                      activeCategory === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Emoji grid */}
            <ScrollView
              style={styles.emojiGrid}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.gridWrap}>
                {EMOJI_CATEGORIES[activeCategory]?.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiItem}
                    onPress={() => handleSelect(emoji)}
                    activeOpacity={0.5}
                  >
                    <ThemedText style={styles.emojiTextLarge}>{emoji}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export const EmojiPicker = memo(EmojiPickerInner);

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: DiscordColors.secondaryBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '55%',
    paddingBottom: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: DiscordColors.textMuted,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  divider: {
    height: 1,
    backgroundColor: DiscordColors.divider,
    marginHorizontal: Spacing.md,
  },
  categoryTabs: {
    flexGrow: 0,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
  },
  categoryTabActive: {
    backgroundColor: DiscordColors.blurple,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: DiscordColors.textMuted,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  emojiGrid: {
    paddingHorizontal: Spacing.md,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emojiItem: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiTextLarge: {
    fontSize: 26,
  },
});
