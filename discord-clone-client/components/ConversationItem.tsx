import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { UserAvatarWithActions } from './UserAvatarWithActions';
import { UserRowNameplate } from './UserRowNameplate';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/formatTime';
import { User } from '@/store/useAuthStore';

// ─── Props Interface ─────────────────────────────────────────
interface ConversationItemProps {
  /** The other participant in the conversation */
  participant: User;
  /** Preview of the last message */
  lastMessageContent?: string;
  /** Name of the last message sender */
  lastMessageSender?: string;
  /** Timestamp of the last message */
  lastMessageTime?: string;
  /** Number of unread messages */
  unreadCount?: number;
  /** Called when the conversation is pressed */
  onPress: () => void;
  /** Index in the list, used for staggered animation delay */
  index?: number;
}

// ─── Component (SRP: Only renders a single conversation row) ─
function ConversationItemInner({
  participant,
  lastMessageContent,
  lastMessageSender,
  lastMessageTime,
  unreadCount = 0,
  onPress,
  index = 0,
}: ConversationItemProps) {
  const hasUnread = unreadCount > 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <TouchableOpacity
        style={styles.containerWrapper}
        onPress={onPress}
        activeOpacity={0.6}
      >
        <UserRowNameplate cardEffectId={participant.cardEffectId} style={styles.container}>
          {/* Avatar with online status */}
          <UserAvatarWithActions
            user={{
              id: participant.id,
              username: participant.username,
              displayName: participant.displayName,
              avatar: participant.avatar,
              status: participant.status,
              bio: participant.bio,
              avatarEffectId: participant.avatarEffectId,
              bannerEffectId: participant.bannerEffectId,
              cardEffectId: participant.cardEffectId,
            }}
            size={48}
          />

          {/* Conversation info */}
          <View style={styles.content}>
            <View style={styles.topRow}>
              <ThemedText
                style={[styles.username, hasUnread && styles.unreadText]}
                numberOfLines={1}
              >
                {participant.displayName || participant.username}
              </ThemedText>
              {lastMessageTime && (
                <ThemedText
                  style={[styles.time, hasUnread && styles.unreadTime]}
                >
                  {formatRelativeTime(lastMessageTime)}
                </ThemedText>
              )}
            </View>

            <View style={styles.bottomRow}>
              <ThemedText
                style={[styles.preview, hasUnread && styles.unreadText]}
                numberOfLines={1}
              >
                {lastMessageContent
                  ? lastMessageSender
                    ? `${lastMessageSender}: ${lastMessageContent}`
                    : lastMessageContent
                  : 'Start a conversation'}
              </ThemedText>

              {hasUnread && (
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </UserRowNameplate>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Memoized export ─────────────────────────────────────────
export const ConversationItem = memo(ConversationItemInner);

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  containerWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: Spacing.sm,
    marginVertical: 2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: DiscordColors.textSecondary,
    marginRight: Spacing.sm,
  },
  time: {
    fontSize: 12,
    color: DiscordColors.textMuted,
  },
  preview: {
    flex: 1,
    fontSize: 14,
    color: DiscordColors.textMuted,
    marginRight: Spacing.sm,
  },
  unreadText: {
    color: DiscordColors.textPrimary,
    fontWeight: '700',
  },
  unreadTime: {
    color: DiscordColors.textPrimary,
  },
  badge: {
    backgroundColor: DiscordColors.red,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
