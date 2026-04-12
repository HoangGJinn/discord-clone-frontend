import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Clipboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { ThemedText } from '@/components/themed-text';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { EditMessageInput } from '@/components/EditMessageInput';
import { MessageActionSheet } from '@/components/MessageActionSheet';
import { EmojiPicker } from '@/components/EmojiPicker';
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
        const messageData = JSON.parse(frame.body);
        addRealtimeMessage(messageData);
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
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useDMStore();

  // ── Day 4 State ────────────────────────────────────────
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(null);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [emojiTargetMessageId, setEmojiTargetMessageId] = useState<string | null>(null);

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

  // ── Message long-press handler ─────────────────────────
  const handleLongPress = useCallback((message: DirectMessage) => {
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
  }, [selectedMessage, user, deleteMessage]);

  // ── Quick react from action sheet ──────────────────────
  const handleQuickReact = useCallback(
    (emoji: string) => {
      if (!selectedMessage) return;
      addReaction(selectedMessage.id, emoji);
    },
    [selectedMessage, addReaction],
  );

  // ── Toggle reaction on message ─────────────────────────
  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || !user) return;

      const existing = msg.reactions?.find((r) => r.emoji === emoji);
      if (existing?.users.includes(user.id)) {
        removeReaction(messageId, emoji);
      } else {
        addReaction(messageId, emoji);
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
        addReaction(emojiTargetMessageId, emoji);
      }
      setEmojiTargetMessageId(null);
    },
    [emojiTargetMessageId, addReaction],
  );

  // ── Edit save handler ──────────────────────────────────
  const handleEditSave = useCallback(
    (newContent: string) => {
      if (!editingMessage) return;
      editMessage(editingMessage.id, newContent);
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
            onLongPress={handleLongPress}
            onToggleReaction={handleToggleReaction}
            onAddReaction={handleAddReaction}
            currentUserId={user?.id}
          />
        </View>
      );
    },
    [user?.id, shouldShowHeader, messages, handleLongPress, handleToggleReaction, handleAddReaction],
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
          <>
            <View style={styles.headerUser}>
              <Avatar
                name={otherUser.displayName || otherUser.username}
                uri={otherUser.avatar}
                size={32}
                status={
                  (otherUser.status?.toUpperCase() as
                    | "ONLINE"
                    | "IDLE"
                    | "DND"
                    | "OFFLINE") || "OFFLINE"
                }
              />
              <View style={styles.headerInfo}>
                <ThemedText style={styles.headerName} numberOfLines={1}>
                  {otherUser.displayName || otherUser.username}
                </ThemedText>
                <ThemedText style={styles.headerStatus}>
                  {otherUser.status || "Offline"}
                </ThemedText>
              </View>
            </View>

            {/* Header Actions */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => alert("Voice Call feature coming soon!")}
                style={styles.actionBtn}
              >
                <Ionicons
                  name="call"
                  size={22}
                  color={DiscordColors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => alert("Video Call feature coming soon!")}
                style={styles.actionBtn}
              >
                <Ionicons
                  name="videocam"
                  size={24}
                  color={DiscordColors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => alert("Search feature coming soon!")}
                style={styles.actionBtn}
              >
                <Ionicons
                  name="search"
                  size={24}
                  color={DiscordColors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color={DiscordColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </>
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
          placeholder={
            otherUser
              ? `Message @${otherUser.username}`
              : 'Send a message...'
          }
          disabled={isSending}
        />
      )}

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
    fontWeight: "700",
    color: DiscordColors.textPrimary,
  },
  headerStatus: {
    fontSize: 12,
    color: DiscordColors.textMuted,
    textTransform: "capitalize",
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
