import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { Reaction } from '@/types/dm';

// ─── Props ───────────────────────────────────────────────────
interface ReactionBarProps {
  reactions: Reaction[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
  onAddReaction: () => void;
}

// ─── Component ───────────────────────────────────────────────
function ReactionBarInner({
  reactions,
  currentUserId,
  onToggleReaction,
  onAddReaction,
}: ReactionBarProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
      {reactions.map((reaction) => {
        const isActive = reaction.users.includes(currentUserId);
        return (
          <TouchableOpacity
            key={reaction.emoji}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleReaction(reaction.emoji);
            }}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.emoji}>{reaction.emoji}</ThemedText>
            <ThemedText
              style={[styles.count, isActive && styles.countActive]}
            >
              {reaction.count}
            </ThemedText>
          </TouchableOpacity>
        );
      })}

      {/* Add reaction button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAddReaction();
        }}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.addIcon}>+</ThemedText>
      </TouchableOpacity>
    </Animated.View>
  );
}

export const ReactionBar = memo(ReactionBarInner);

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: DiscordColors.tertiaryBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    borderColor: DiscordColors.blurple,
    backgroundColor: 'rgba(88, 101, 242, 0.15)',
  },
  emoji: {
    fontSize: 16,
    marginRight: 4,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    color: DiscordColors.textSecondary,
  },
  countActive: {
    color: DiscordColors.blurple,
  },
  addBtn: {
    width: 30,
    height: 26,
    borderRadius: 12,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 16,
    color: DiscordColors.textMuted,
    fontWeight: '600',
  },
});
