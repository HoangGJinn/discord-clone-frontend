import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatarWithActions } from './UserAvatarWithActions';
import { ThemedText } from './themed-text';
import { ReactionBar } from './ReactionBar';
import { ImageAttachment } from './ImageAttachment';
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
  /** Called when user long-presses on message */
  onLongPress?: (message: DirectMessage) => void;
  /** Called when user toggles a reaction */
  onToggleReaction?: (messageId: string, emoji: string) => void;
  /** Called when user wants to add a new reaction */
  onAddReaction?: (messageId: string) => void;
  /** Current user ID for reaction highlighting */
  currentUserId?: string;
}

// ─── Component (SRP: Only renders a single message bubble) ───
function MessageBubbleInner({
  message,
  isOwn,
  showHeader,
  onLongPress,
  onToggleReaction,
  onAddReaction,
  currentUserId,
}: MessageBubbleProps) {
  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress(message);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
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
            <UserAvatarWithActions
              user={{
                id: message.sender.id,
                username: message.sender.username,
                displayName: message.sender.displayName,
                avatar: message.sender.avatar,
                status: message.sender.status,
                bio: message.sender.bio,
              }}
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
              {/* Pin indicator */}
              {message.pinned && (
                <Ionicons
                  name="pin"
                  size={12}
                  color={DiscordColors.yellow}
                  style={styles.pinIcon}
                />
              )}
            </View>
          )}

          <ThemedText style={styles.content}>
            {message.content}
          </ThemedText>

          {/* Image attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <ImageAttachment attachments={message.attachments} />
          )}

          {/* Edited indicator */}
          {message.edited && (
            <ThemedText style={styles.editedLabel}>(edited)</ThemedText>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <ReactionBar
              reactions={message.reactions}
              currentUserId={currentUserId || ''}
              onToggleReaction={(emoji) =>
                onToggleReaction?.(message.id, emoji)
              }
              onAddReaction={() => onAddReaction?.(message.id)}
            />
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
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
  pinIcon: {
    marginLeft: 6,
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
