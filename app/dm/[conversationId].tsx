import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { ThemedText } from '@/components/themed-text';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { useDMStore } from '@/store/useDMStore';
import { useAuthStore } from '@/store/useAuthStore';
import { DirectMessage, getOtherParticipant } from '@/types/dm';
import { DiscordColors, Spacing } from '@/constants/theme';
import { isDifferentDay, formatDaySeparator } from '@/utils/formatTime';
import socketService from '@/services/socketService';

// ─── Custom Hook: Encapsulates WebSocket subscription logic ──
function useDMWebSocket(conversationId: string) {
  const addRealtimeMessage = useDMStore((s) => s.addRealtimeMessage);

  useEffect(() => {
    if (!conversationId) return;

    const destination = `/topic/dm/${conversationId}`;

    const subscription = socketService.subscribe(destination, (frame) => {
      try {
        const message: DirectMessage = JSON.parse(frame.body);
        addRealtimeMessage(message);
      } catch (err) {
        console.error('Failed to parse DM WebSocket message:', err);
      }
    });

    return () => {
      socketService.unsubscribe(destination);
    };
  }, [conversationId, addRealtimeMessage]);
}

// ─── Screen ──────────────────────────────────────────────────
export default function DMChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const user = useAuthStore((s) => s.user);
  const {
    messages,
    conversations,
    isLoadingMessages,
    hasMoreMessages,
    isSending,
    fetchMessages,
    loadMoreMessages,
    sendMessage,
    clearMessages,
  } = useDMStore();

  // ── Find the other participant from conversations list ─
  const conversation = conversations.find((c) => c.id === conversationId);
  const otherUser =
    conversation && user
      ? getOtherParticipant(conversation, user.id)
      : null;

  // ── Load messages on mount ─────────────────────────────
  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
    return () => {
      clearMessages();
    };
  }, [conversationId]);

  // ── Subscribe to real-time updates ─────────────────────
  useDMWebSocket(conversationId || '');

  // ── Send message handler ───────────────────────────────
  const handleSend = useCallback(
    (content: string) => {
      if (!conversationId) return;
      sendMessage({ conversationId, content });
    },
    [conversationId, sendMessage],
  );

  // ── Determine if message needs a header ────────────────
  const shouldShowHeader = useCallback(
    (index: number): boolean => {
      if (index === messages.length - 1) return true; // oldest message in inverted list

      const current = messages[index];
      const previous = messages[index + 1]; // next older message (inverted)

      if (!previous) return true;
      if (current.sender.id !== previous.sender.id) return true;
      if (isDifferentDay(previous.createdAt, current.createdAt)) return true;

      // Show header if more than 5 minutes gap
      const diff =
        new Date(current.createdAt).getTime() -
        new Date(previous.createdAt).getTime();
      return Math.abs(diff) > 5 * 60 * 1000;
    },
    [messages],
  );

  // ── Render message item ────────────────────────────────
  const renderMessage = useCallback(
    ({ item, index }: { item: DirectMessage; index: number }) => {
      const isOwn = item.sender.id === user?.id;
      const showHeader = shouldShowHeader(index);

      // Day separator: check if the next (older) message is on a different day
      const nextItem = messages[index + 1];
      const showDaySeparator =
        !nextItem || isDifferentDay(nextItem.createdAt, item.createdAt);

      return (
        <View>
          {showDaySeparator && (
            <View style={styles.daySeparator}>
              <View style={styles.daySeparatorLine} />
              <ThemedText style={styles.daySeparatorText}>
                {formatDaySeparator(item.createdAt)}
              </ThemedText>
              <View style={styles.daySeparatorLine} />
            </View>
          )}
          <MessageBubble
            message={item}
            isOwn={isOwn}
            showHeader={showHeader}
          />
        </View>
      );
    },
    [user?.id, shouldShowHeader, messages],
  );

  const keyExtractor = useCallback((item: DirectMessage) => item.id, []);

  // ── Load more trigger ──────────────────────────────────
  const handleEndReached = useCallback(() => {
    if (hasMoreMessages && !isLoadingMessages) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, isLoadingMessages, loadMoreMessages]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={DiscordColors.textPrimary}
          />
        </TouchableOpacity>

        {otherUser && (
          <View style={styles.headerUser}>
            <Avatar
              name={otherUser.displayName || otherUser.username}
              uri={otherUser.avatar}
              size={32}
              status={
                (otherUser.status?.toUpperCase() as
                  | 'ONLINE'
                  | 'IDLE'
                  | 'DND'
                  | 'OFFLINE') || 'OFFLINE'
              }
            />
            <View style={styles.headerInfo}>
              <ThemedText style={styles.headerName} numberOfLines={1}>
                {otherUser.displayName || otherUser.username}
              </ThemedText>
              <ThemedText style={styles.headerStatus}>
                {otherUser.status || 'Offline'}
              </ThemedText>
            </View>
          </View>
        )}
      </View>

      {/* Messages list (inverted = newest at bottom) */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMessages ? (
            <ActivityIndicator
              color={DiscordColors.blurple}
              style={styles.loader}
            />
          ) : null
        }
        ListEmptyComponent={
          !isLoadingMessages ? (
            <View style={styles.emptyContainer}>
              {otherUser && (
                <>
                  <Avatar
                    name={otherUser.displayName || otherUser.username}
                    uri={otherUser.avatar}
                    size={72}
                  />
                  <ThemedText style={styles.emptyTitle}>
                    {otherUser.displayName || otherUser.username}
                  </ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    This is the beginning of your direct message history with{' '}
                    <ThemedText style={styles.emptyBold}>
                      @{otherUser.username}
                    </ThemedText>
                    .
                  </ThemedText>
                </>
              )}
            </View>
          ) : null
        }
        contentContainerStyle={
          messages.length === 0 ? styles.emptyList : styles.listContent
        }
      />

      {/* Chat input */}
      <ChatInput
        onSend={handleSend}
        placeholder={
          otherUser
            ? `Message @${otherUser.username}`
            : 'Send a message...'
        }
        disabled={isSending}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: DiscordColors.secondaryBackground,
    borderBottomWidth: 1,
    borderBottomColor: DiscordColors.divider,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerInfo: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: DiscordColors.textPrimary,
  },
  headerStatus: {
    fontSize: 12,
    color: DiscordColors.textMuted,
    textTransform: 'capitalize',
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
  loader: {
    paddingVertical: Spacing.xl,
  },
  daySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: DiscordColors.divider,
  },
  daySeparatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: DiscordColors.textMuted,
    marginHorizontal: Spacing.sm,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    // In inverted list, this appears at the top
    transform: [{ scaleY: -1 }],
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DiscordColors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DiscordColors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  emptyBold: {
    fontWeight: '700',
    color: DiscordColors.textSecondary,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
