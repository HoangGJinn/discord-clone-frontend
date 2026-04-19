import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatarWithActions } from './UserAvatarWithActions';
import { NAMEPLATE_EFFECTS } from '@/constants/profileEffects';
import { ThemedText } from './themed-text';
import { ReactionBar } from './ReactionBar';
import { MessageAttachments } from './MessageAttachments';
import { DiscordColors, Spacing } from '@/constants/theme';
import { DirectMessage } from '@/types/dm';
import { isImageAttachment } from '@/utils/attachments';
import { formatMessageTime } from '@/utils/formatTime';
import { useAuthStore } from '@/store/useAuthStore';

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
  /** Jump to original message when tapping reply preview */
  onPressReplyTarget?: (targetMessageId: string) => void;
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
  onPressReplyTarget,
}: MessageBubbleProps) {
  const currentUser = useAuthStore((state) => state.user);

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress(message);
    }
  };

  const resolvedAvatar = isOwn
    ? message.sender.avatar || currentUser?.avatar || ''
    : message.sender.avatar;

  const replyToMessage = message.replyToMessage;
  const replyAuthor =
    replyToMessage?.sender?.displayName ||
    replyToMessage?.sender?.username ||
    replyToMessage?.senderName ||
    'Unknown';
  const replySummary = (() => {
    if (!replyToMessage) return '';
    if (replyToMessage.deleted) return 'Original message deleted';
    const content = replyToMessage.content?.trim();
    if (content) {
      return content;
    }
    const attachments = replyToMessage.attachments || [];
    if (!attachments.length) {
      return 'Message';
    }

    const hasImage = attachments.some((item) => isImageAttachment(item));
    if (hasImage && attachments.length === 1) {
      return 'Photo';
    }
    if (hasImage) {
      return `${attachments.length} attachments`;
    }
    return attachments.length === 1 ? 'File' : `${attachments.length} files`;
  })();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
      <View
        style={[
          styles.container,
          showHeader ? styles.withHeader : styles.grouped,
        ]}
      >
        {showHeader && message.sender.cardEffectId && (
          (() => {
            const effect = NAMEPLATE_EFFECTS.find(e => e.id === message.sender.cardEffectId);
            if (!effect) return null;
            return (
              <Image
                source={effect.uri}
                style={styles.messageNameplate}
                pointerEvents="none"
                contentFit="cover"
              />
            );
          })()
        )}
        {/* Avatar column */}
        <View style={styles.avatarColumn}>
          {showHeader ? (
            <UserAvatarWithActions
              user={{
                id: message.sender.id,
                username: message.sender.username,
                displayName: message.sender.displayName,
                avatar: resolvedAvatar,
                status: message.sender.status,
                avatarEffectId: message.sender.avatarEffectId,
                bannerEffectId: message.sender.bannerEffectId,
                cardEffectId: message.sender.cardEffectId,
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

          {replyToMessage && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                if (replyToMessage.id) {
                  onPressReplyTarget?.(replyToMessage.id);
                }
              }}
              style={styles.replyBlock}
            >
              <View style={styles.replyBar} />
              <View style={styles.replyBody}>
                <ThemedText style={styles.replyAuthor}>{replyAuthor}</ThemedText>
                <ThemedText numberOfLines={1} style={styles.replyContent}>
                  {replySummary}
                </ThemedText>
              </View>
            </TouchableOpacity>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <MessageAttachments attachments={message.attachments} />
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
      </View>
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
  replyBlock: {
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: DiscordColors.secondaryBackground,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: DiscordColors.blurple,
    marginRight: 8,
  },
  replyBody: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: DiscordColors.blurple,
  },
  replyContent: {
    fontSize: 12,
    color: DiscordColors.textSecondary,
    marginTop: 1,
  },
  editedLabel: {
    fontSize: 10,
    color: DiscordColors.textMuted,
    marginTop: 2,
  },
  messageNameplate: {
    ...StyleSheet.absoluteFillObject,
    height: 50, // Constrain height for message header
    opacity: 0.15, // Subtle background
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
});
