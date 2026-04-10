import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { useChannelChatStore } from '@/store/useChannelChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ChannelMessage } from '@/types/channel';
import { DiscordColors, Spacing } from '@/constants/theme';
import { isDifferentDay, formatDaySeparator } from '@/utils/formatTime';
import socketService from '@/services/socketService';

// ─── Custom Hook: Encapsulates WebSocket subscription logic ──
function useChannelWebSocket(channelId: string) {
  const addRealtimeMessage = useChannelChatStore((s) => s.addRealtimeMessage);

  useEffect(() => {
    if (!channelId) return;

    const destination = `/topic/channel/${channelId}`;

    const subscription = socketService.subscribe(destination, (frame) => {
      try {
        const message: ChannelMessage = JSON.parse(frame.body);
        addRealtimeMessage(message);
      } catch (err) {
        console.error('Failed to parse Channel WebSocket message:', err);
      }
    });

    return () => {
      socketService.unsubscribe(destination);
    };
  }, [channelId, addRealtimeMessage]);
}

// ─── Screen ──────────────────────────────────────────────────
export default function ChannelChatScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const user = useAuthStore((s) => s.user);
  const {
    messages,
    isLoadingMessages,
    hasMoreMessages,
    isSending,
    fetchMessages,
    loadMoreMessages,
    sendMessage,
    clearMessages,
  } = useChannelChatStore();

  // ── Load messages on mount ─────────────────────────────
  useEffect(() => {
    if (channelId) {
      fetchMessages(channelId);
    }
    return () => {
      clearMessages();
    };
  }, [channelId]);

  // ── Subscribe to real-time updates ─────────────────────
  useChannelWebSocket(channelId || '');

  // ── Send message handler ───────────────────────────────
  const handleSend = useCallback(
    (content: string) => {
      if (!channelId) return;
      sendMessage(channelId, { content });
    },
    [channelId, sendMessage],
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
    ({ item, index }: { item: ChannelMessage; index: number }) => {
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
          {/* Note: MessageBubble handles both DirectMessage and ChannelMessage because their structural layout (sender, content, createdAt) is similar */}
          <MessageBubble
            message={item as any} 
            isOwn={isOwn}
            showHeader={showHeader}
          />
        </View>
      );
    },
    [user?.id, shouldShowHeader, messages],
  );

  const keyExtractor = useCallback((item: ChannelMessage) => item.id, []);

  // ── Load more trigger ──────────────────────────────────
  const handleEndReached = useCallback(() => {
    if (hasMoreMessages && !isLoadingMessages) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, isLoadingMessages, loadMoreMessages]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name="menu" // often menu is used in channels, or back arrow if pushed via stack
            size={24}
            color={DiscordColors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Ionicons name="hashtag" size={20} color={DiscordColors.textMuted} style={styles.hashIcon} />
          <ThemedText style={styles.headerName} numberOfLines={1}>
            general {/* Should ideally come from a channel store or props */}
          </ThemedText>
        </View>

        {/* Header Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons
              name="search"
              size={24}
              color={DiscordColors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons
              name="people"
              size={24}
              color={DiscordColors.textSecondary}
            />
          </TouchableOpacity>
        </View>
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
              <View style={styles.hashCircle}>
                <Ionicons name="hashtag" size={40} color={DiscordColors.textPrimary} />
              </View>
              <ThemedText style={styles.emptyTitle}>
                Welcome to channel!
              </ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                This is the start of the channel.
              </ThemedText>
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
        placeholder={`Message in channel`}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: Spacing.sm,
  },
  hashIcon: {
    marginRight: 4,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: DiscordColors.textPrimary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtn: {
    paddingHorizontal: Spacing.xs,
    marginLeft: Spacing.xs,
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
  hashCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DiscordColors.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: DiscordColors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DiscordColors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
