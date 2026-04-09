import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Avatar } from './Avatar';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { DirectMessage } from '@/types/dm';
import { formatMessageTime } from '@/utils/formatTime';

// ─── Props Interface ─────────────────────────────────────────
interface MessageBubbleProps {
  /** The message data to display */
  message: DirectMessage;
  /** Whether this message was sent by the current user */
  isOwn: boolean;
  /** Whether to show the avatar + username header (false for grouped messages) */
  showHeader: boolean;
}

// ─── Component (SRP: Only renders a single message bubble) ───
function MessageBubbleInner({ message, isOwn, showHeader }: MessageBubbleProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[
        styles.container,
        showHeader ? styles.withHeader : styles.grouped,
      ]}
    >
      {/* Avatar column */}
      <View style={styles.avatarColumn}>
        {showHeader ? (
          <Avatar
            name={message.sender.username}
            uri={message.sender.avatar}
            size={40}
          />
        ) : (
          <View style={styles.avatarSpacer} />
        )}
      </View>

      {/* Content column */}
      <View style={styles.contentColumn}>
        {showHeader && (
          <View style={styles.headerRow}>
            <ThemedText
              style={[
                styles.username,
                isOwn && styles.ownUsername,
              ]}
            >
              {message.sender.displayName || message.sender.username}
            </ThemedText>
            <ThemedText style={styles.timestamp}>
              {formatMessageTime(message.createdAt)}
            </ThemedText>
          </View>
        )}

        <ThemedText style={styles.content}>
          {message.content}
        </ThemedText>

        {/* Edited indicator */}
        {message.edited && (
          <ThemedText style={styles.editedLabel}>(edited)</ThemedText>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Memoized export (Open/Closed: extendable via props) ─────
export const MessageBubble = memo(MessageBubbleInner);

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
  },
  withHeader: {
    paddingTop: Spacing.md,
  },
  grouped: {
    paddingTop: 2,
  },
  avatarColumn: {
    width: 40,
    marginRight: Spacing.md,
  },
  avatarSpacer: {
    width: 40,
    height: 0,
  },
  contentColumn: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: DiscordColors.textPrimary,
    marginRight: Spacing.sm,
  },
  ownUsername: {
    color: DiscordColors.blurple,
  },
  timestamp: {
    fontSize: 11,
    color: DiscordColors.textMuted,
  },
  content: {
    fontSize: 15,
    color: DiscordColors.textPrimary,
    lineHeight: 22,
  },
  editedLabel: {
    fontSize: 10,
    color: DiscordColors.textMuted,
    marginTop: 2,
  },
});
