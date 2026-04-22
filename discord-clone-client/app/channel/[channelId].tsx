import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { EditMessageInput } from '@/components/EditMessageInput';
import { MessageActionSheet } from '@/components/MessageActionSheet';
import { EmojiPicker } from '@/components/EmojiPicker';
import { useChannelChatStore } from '@/store/useChannelChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useServerStore } from '@/store/useServerStore';
import { ChannelMessage } from '@/types/channel';
import { DiscordColors, Spacing } from '@/constants/theme';
import { isDifferentDay, formatDaySeparator } from '@/utils/formatTime';
import socketService from '@/services/socketService';
import { ChannelResponse, getChannelById, markChannelAsRead } from '@/services/serverService';

// ─── Custom Hook: Encapsulates WebSocket subscription logic ──
function useChannelWebSocket(channelId: string) {
  const addRealtimeMessage = useChannelChatStore((s) => s.addRealtimeMessage);

  useEffect(() => {
    if (!channelId) return;

    const destination = `/topic/channel/${channelId}`;

    void socketService.subscribe(destination, (message) => {
      try {
        addRealtimeMessage(message as ChannelMessage);
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
  const flatListRef = useRef<FlatList<ChannelMessage>>(null);
  const pendingScrollIndexRef = useRef<number | null>(null);
  const [channelInfo, setChannelInfo] = useState<ChannelResponse | null>(null);

  const user = useAuthStore((s) => s.user);
  const clearChannelUnread = useServerStore((s) => s.clearChannelUnread);
  const {
    messages,
    isLoadingMessages,
    hasMoreMessages,
    isSending,
    fetchMessages,
    loadMoreMessages,
    sendMessage,
    clearMessages,
    editMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    addReaction,
    removeReaction,
  } = useChannelChatStore();

  // ── Day 4 State ────────────────────────────────────────
  const [selectedMessage, setSelectedMessage] = useState<ChannelMessage | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChannelMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChannelMessage | null>(null);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [emojiTargetMessageId, setEmojiTargetMessageId] = useState<string | null>(null);

  // ── Load messages on mount ─────────────────────────────
  useEffect(() => {
    if (channelId) {
      fetchMessages(channelId);
    }
    return () => {
      clearMessages();
    };
  }, [channelId]);

  useEffect(() => {
    const loadChannel = async () => {
      if (!channelId) {
        setChannelInfo(null);
        return;
      }

      try {
        const response = await getChannelById(Number(channelId));
        setChannelInfo(response);
        if (response?.serverId) {
          clearChannelUnread(response.serverId, Number(channelId));
        }
        await markChannelAsRead(Number(channelId));
      } catch {
        setChannelInfo(null);
      }
    };

    void loadChannel();
  }, [channelId, clearChannelUnread]);

  // ── Subscribe to real-time updates ─────────────────────
  useChannelWebSocket(channelId || '');

  // ── Send message handler ───────────────────────────────
  const handleSend = useCallback(
    (content: string, attachments?: ChannelMessage['attachments'], replyToId?: string) => {
      if (!channelId) return;
      sendMessage(channelId, {
        content,
        attachments,
        replyToId,
      });
    },
    [channelId, sendMessage],
  );

  // ── Message long-press handler ─────────────────────────
  const handleLongPress = useCallback((message: ChannelMessage) => {
    setSelectedMessage(message);
    setActionSheetVisible(true);
  }, []);

  // ── Build action sheet actions ─────────────────────────
  const getActions = useCallback(() => {
    if (!selectedMessage || !user) return [];

    const isOwn = selectedMessage.sender.id === user.id;
    const actions = [];

    // Copy text
    actions.push({
      id: 'copy',
      label: 'Copy Text',
      icon: 'copy-outline' as const,
      onPress: () => {
        Clipboard.setString(selectedMessage.content);
      },
    });

    actions.push({
      id: 'reply',
      label: 'Reply',
      icon: 'return-up-back-outline' as const,
      onPress: () => {
        setReplyingToMessage(selectedMessage);
      },
    });

    // Pin/Unpin
    actions.push({
      id: 'pin',
      label: selectedMessage.pinned ? 'Unpin Message' : 'Pin Message',
      icon: 'pin-outline' as const,
      onPress: () => {
        if (selectedMessage.pinned) {
          unpinMessage(selectedMessage.id);
        } else {
          pinMessage(selectedMessage.id);
        }
      },
    });

    // Edit (own message only)
    if (isOwn) {
      actions.push({
        id: 'edit',
        label: 'Edit Message',
        icon: 'pencil-outline' as const,
        onPress: () => {
          setEditingMessage(selectedMessage);
        },
      });
    }

    // Delete (own message)
    if (isOwn) {
      actions.push({
        id: 'delete',
        label: 'Delete Message',
        icon: 'trash-outline' as const,
        color: DiscordColors.red,
        onPress: () => {
          Alert.alert(
            'Delete Message',
            'Are you sure you want to delete this message?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteMessage(selectedMessage.id),
              },
            ],
          );
        },
      });
    }

    return actions;
  }, [selectedMessage, user, pinMessage, unpinMessage, deleteMessage]);

  // ── Quick react from action sheet ──────────────────────
  const handleQuickReact = useCallback(
    (emoji: string) => {
      if (!selectedMessage) return;
      addReaction(selectedMessage.id, { emoji });
    },
    [selectedMessage, addReaction],
  );

  // ── Toggle reaction on message ─────────────────────────
  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || !user) return;

      const existing = msg.reactions?.find((r) => r.emoji === emoji);
      if (existing?.users?.includes(user.id)) {
        removeReaction(messageId, { emoji });
      } else {
        addReaction(messageId, { emoji });
      }
    },
    [messages, user, addReaction, removeReaction],
  );

  // ── Open emoji picker for reaction ─────────────────────
  const handleAddReaction = useCallback((messageId: string) => {
    setEmojiTargetMessageId(messageId);
    setEmojiPickerVisible(true);
  }, []);

  const handleEmojiSelected = useCallback(
    (emoji: string) => {
      if (emojiTargetMessageId) {
        addReaction(emojiTargetMessageId, { emoji });
      }
      setEmojiTargetMessageId(null);
    },
    [emojiTargetMessageId, addReaction],
  );

  // ── Edit save handler ──────────────────────────────────
  const handleEditSave = useCallback(
    (newContent: string) => {
      if (!editingMessage) return;
      editMessage(editingMessage.id, { content: newContent });
      setEditingMessage(null);
    },
    [editingMessage, editMessage],
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
          <MessageBubble
            message={item as any}
            isOwn={isOwn}
            showHeader={showHeader}
            onLongPress={handleLongPress as any}
            onToggleReaction={handleToggleReaction}
            onAddReaction={handleAddReaction}
            currentUserId={user?.id}
            onPressReplyTarget={scrollToMessageById}
          />
        </View>
      );
    },
    [user?.id, shouldShowHeader, messages, handleLongPress, handleToggleReaction, handleAddReaction],
  );

  const keyExtractor = useCallback((item: ChannelMessage) => item.id, []);

  // ── Load more trigger ──────────────────────────────────
  const handleEndReached = useCallback(() => {
    if (hasMoreMessages && !isLoadingMessages) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, isLoadingMessages, loadMoreMessages]);

  const scrollToMessageById = useCallback((targetMessageId: string) => {
    const targetIndex = messages.findIndex((item) => item.id === targetMessageId);
    if (targetIndex < 0) {
      Alert.alert('Not loaded yet', 'Original message is not loaded in current list. Scroll up to load older messages.');
      return;
    }

    pendingScrollIndexRef.current = targetIndex;
    flatListRef.current?.scrollToIndex({
      index: targetIndex,
      animated: true,
      viewPosition: 0.45,
    });
  }, [messages]);

  const handleOpenMembers = useCallback(() => {
    const serverId = channelInfo?.serverId;
    if (!serverId) return;

    router.push({
      pathname: '/server/[serverId]/members',
      params: { serverId: String(serverId) },
    });
  }, [channelInfo?.serverId, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={DiscordColors.textPrimary}
          />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Feather name="hash" size={20} color={DiscordColors.textMuted} style={styles.hashIcon} />
          <ThemedText style={styles.headerName} numberOfLines={1}>
            {channelInfo?.name || (channelId ? `channel-${channelId}` : 'channel')}
          </ThemedText>
          {channelInfo?.topic ? (
            <ThemedText style={styles.headerTopic} numberOfLines={1}>
              {channelInfo.topic}
            </ThemedText>
          ) : null}
        </View>

        {/* Header Actions */}
        <View style={styles.headerActions}>
          <Pressable style={styles.actionBtn}>
            <Ionicons
              name="search"
              size={20}
              color={DiscordColors.textSecondary}
            />
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={handleOpenMembers}
            disabled={!channelInfo?.serverId}
          >
            <Ionicons
              name="people"
              size={20}
              color={DiscordColors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages list (inverted = newest at bottom) */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          inverted
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          onScrollToIndexFailed={(info) => {
            const retryIndex = pendingScrollIndexRef.current ?? info.index;
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * retryIndex,
              animated: true,
            });

            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: retryIndex,
                animated: true,
                viewPosition: 0.45,
              });
            }, 120);
          }}
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
                  <Feather name="hash" size={40} color={DiscordColors.textPrimary} />
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

        {/* Chat input or Edit input */}
        {editingMessage ? (
          <EditMessageInput
            originalContent={editingMessage.content}
            onSave={handleEditSave}
            onCancel={() => setEditingMessage(null)}
          />
        ) : (
          <ChatInput
            onSend={handleSend}
            placeholder={`Message in #${channelInfo?.name || 'channel'}`}
            disabled={isSending}
            replyToMessage={
              replyingToMessage
                ? {
                    id: replyingToMessage.id,
                    content: replyingToMessage.content,
                    attachments: replyingToMessage.attachments,
                    senderName: replyingToMessage.sender.displayName || replyingToMessage.sender.username,
                    deleted: replyingToMessage.deleted,
                  }
                : null
            }
            onCancelReply={() => setReplyingToMessage(null)}
          />
        )}
      </KeyboardAvoidingView>

      {/* Action Sheet */}
      <MessageActionSheet
        visible={actionSheetVisible}
        onClose={() => {
          setActionSheetVisible(false);
          setSelectedMessage(null);
        }}
        actions={getActions()}
        onQuickReact={handleQuickReact}
      />

      {/* Emoji Picker for reactions */}
      <EmojiPicker
        visible={emojiPickerVisible}
        onClose={() => {
          setEmojiPickerVisible(false);
          setEmojiTargetMessageId(null);
        }}
        onSelectEmoji={handleEmojiSelected}
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
  chatArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: DiscordColors.secondaryBackground,
    borderBottomWidth: 1,
    borderBottomColor: DiscordColors.divider,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: Spacing.md,
  },
  hashIcon: {
    marginRight: 4,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: DiscordColors.textPrimary,
  },
  headerTopic: {
    marginLeft: Spacing.sm,
    fontSize: 12,
    color: DiscordColors.textMuted,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
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
