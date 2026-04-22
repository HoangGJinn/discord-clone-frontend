import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { UserAvatarWithActions } from '@/components/UserAvatarWithActions';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import { EditMessageInput } from '@/components/EditMessageInput';
import { MessageActionSheet } from '@/components/MessageActionSheet';
import { EmojiPicker } from '@/components/EmojiPicker';
import { VoiceCallUI } from '@/components/VoiceCallUI';
import { useDMStore } from '@/store/useDMStore';
import { useAuthStore } from '@/store/useAuthStore';
import { DirectMessage, getOtherParticipant } from '@/types/dm';
import { DiscordColors, Spacing } from '@/constants/theme';
import { NAMEPLATE_EFFECTS } from '@/constants/profileEffects';
import { isDifferentDay, formatDaySeparator } from '@/utils/formatTime';
import socketService from '@/services/socketService';
import { useDMCall } from '@/hooks/useDMCall';

// ─── Custom Hook: Encapsulates WebSocket subscription logic ──
function useDMWebSocket(conversationId: string) {
  const addRealtimeMessage = useDMStore((s) => s.addRealtimeMessage);

  useEffect(() => {
    if (!conversationId) return;

    const destination = `/topic/dm/${conversationId}`;
    const onMessage = (message: DirectMessage) => {
      try {
        addRealtimeMessage(message);
      } catch (err) {
        console.error('Failed to parse DM WebSocket message:', err);
      }
    };

    void socketService.subscribe(destination, onMessage);

    return () => {
      socketService.unsubscribe(destination, onMessage);
    };
  }, [conversationId, addRealtimeMessage]);
}

// ─── Screen ──────────────────────────────────────────────────
export default function DMChatScreen() {
  const { conversationId: conversationIdParam, autoAccept, incomingCall } = useLocalSearchParams<{ conversationId: string | string[], autoAccept?: string, incomingCall?: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList<DirectMessage>>(null);
  const pendingScrollIndexRef = useRef<number | null>(null);
  const conversationId = Array.isArray(conversationIdParam)
    ? conversationIdParam[0]
    : conversationIdParam;

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
    setActiveConversation,
    markConversationAsRead,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useDMStore();

  // ── Day 4 State ────────────────────────────────────────
  const [selectedMessage, setSelectedMessage] = useState<DirectMessage | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<DirectMessage | null>(null);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [emojiTargetMessageId, setEmojiTargetMessageId] = useState<string | null>(null);
  const [voiceCallVisible, setVoiceCallVisible] = useState(false);
  const [callType, setCallType] = useState<'VOICE' | 'VIDEO'>('VOICE');
  const [shouldAutoStartCall, setShouldAutoStartCall] = useState(false);

  // ── Find the other participant from conversations list ─
  const conversation = conversations.find((c) => c.id === conversationId);
  const otherUser =
    conversation && user
      ? getOtherParticipant(conversation, user.id)
      : null;

  // ── Day 5: DM call logic with in-room UI ────────────────────────
  const {
    activeCall,
    isInCall,
    isRemoteSpeaking,
    isLocalSpeaking,
    handleStartCall: startDmCall,
    handleAcceptCall,
    handleEndCall,
    handleToggleMute,
    handleToggleDeafen,
    handleToggleCamera,
    handleSwitchCamera,
  } = useDMCall(conversationId || '', String(user?.id || ''));

  // Open room UI when call is active/pending for this conversation.
  useEffect(() => {
    if (!activeCall || !conversationId) return;
    if (activeCall.conversationId !== conversationId) return;
    if (activeCall.status === 'ENDED' || activeCall.status === 'DECLINED' || activeCall.status === 'MISSED') {
      setVoiceCallVisible(false);
      setShouldAutoStartCall(false);
      return;
    }
    const isCurrentUserCaller = String(activeCall.callerId || '') === String(user?.id || '');
    const shouldShowRoomUi =
      activeCall.status === 'ACCEPTED' ||
      (activeCall.status === 'PENDING' && isCurrentUserCaller);
    if (!shouldShowRoomUi) {
      return;
    }
    setCallType(activeCall.callType);
    setVoiceCallVisible(true);
  }, [activeCall, conversationId, user?.id]);

  // Tự động nhận cuộc gọi nếu người dùng bấm "Nghe" từ Push Notification
  useEffect(() => {
    if (!activeCall || !user?.id) return;
    if (activeCall.status !== 'PENDING') return;
    if (String(activeCall.receiverId) !== String(user.id)) return;

    if (autoAccept === 'true' || incomingCall === 'true') {
      console.log('[DMChatScreen] Auto-accepting call from push notification...');
      handleAcceptCall(activeCall.callType === 'VIDEO').then(() => {
        setCallType(activeCall.callType);
        setVoiceCallVisible(true);
      });
    }
  }, [autoAccept, incomingCall, activeCall, user?.id, handleAcceptCall]);

  const handleStartCall = useCallback(async () => {
    if (!conversationId || !user?.id) return;
    setCallType('VOICE');
    setVoiceCallVisible(true);

    // If current user is receiver of a pending call, join that room by accepting.
    if (
      activeCall &&
      activeCall.conversationId === conversationId &&
      activeCall.status === 'PENDING' &&
      String(activeCall.receiverId) === String(user.id)
    ) {
      await handleAcceptCall(false);
      return;
    }

    setShouldAutoStartCall(true);
    await startDmCall('VOICE');
  }, [activeCall, conversationId, handleAcceptCall, startDmCall, user?.id]);

  const handleStartVideoCall = useCallback(async () => {
    if (!conversationId || !user?.id) return;
    setCallType('VIDEO');
    setVoiceCallVisible(true);

    if (
      activeCall &&
      activeCall.conversationId === conversationId &&
      activeCall.status === 'PENDING' &&
      String(activeCall.receiverId) === String(user.id)
    ) {
      await handleAcceptCall(true);
      return;
    }

    setShouldAutoStartCall(true);
    await startDmCall('VIDEO');
  }, [activeCall, conversationId, handleAcceptCall, startDmCall, user?.id]);

  const handleLeaveCall = useCallback(() => {
    setVoiceCallVisible(false);
    setShouldAutoStartCall(false);
  }, []);


  // ── Load messages on mount ─────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    setActiveConversation(conversationId);
    fetchMessages(conversationId);
    void markConversationAsRead(conversationId);

    return () => {
      setActiveConversation(null);
    };
  }, [conversationId, fetchMessages, setActiveConversation]);

  // Ensure chat history is refreshed every time screen gets focus.
  useFocusEffect(
    useCallback(() => {
      if (!conversationId) return;
      setActiveConversation(conversationId);
      fetchMessages(conversationId);
      void markConversationAsRead(conversationId);
      return undefined;
    }, [conversationId, fetchMessages, markConversationAsRead, setActiveConversation]),
  );

  // ── Subscribe to real-time updates ─────────────────────
  useDMWebSocket(conversationId || '');

  // ── Send message handler ───────────────────────────────
  const handleSend = useCallback(
    (content: string, attachments?: DirectMessage['attachments'], replyToId?: string) => {
      if (!conversationId) return;
      sendMessage({ conversationId, content, attachments, replyToId });
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

    actions.push({
      id: 'reply',
      label: 'Reply',
      icon: 'return-up-back-outline' as const,
      onPress: () => {
        setReplyingToMessage(selectedMessage);
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
      if (existing?.users?.includes(user.id)) {
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
      if (String(current.sender.id) !== String(previous.sender.id)) return true;
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
      const isOwn = String(item.sender.id) === String(user?.id || '');
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
            onPressReplyTarget={scrollToMessageById}
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
              <UserAvatarWithActions
                user={{
                  id: otherUser.id,
                  username: otherUser.username,
                  displayName: otherUser.displayName,
                  avatar: otherUser.avatar,
                  status: otherUser.status,
                  bio: otherUser.bio,
                  avatarEffectId: otherUser.avatarEffectId,
                  bannerEffectId: otherUser.bannerEffectId,
                  cardEffectId: otherUser.cardEffectId,
                }}
                size={32}
              />
              {otherUser.cardEffectId && (
                (() => {
                  const effect = NAMEPLATE_EFFECTS.find(e => e.id === otherUser.cardEffectId);
                  if (!effect) return null;
                  return (
                    <Image
                      source={effect.uri}
                      style={styles.headerNameplate}
                      pointerEvents="none"
                      contentFit="cover"
                    />
                  );
                })()
              )}
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
                onPress={handleStartCall}
                style={styles.actionBtn}
              >
                <Ionicons
                  name="call"
                  size={22}
                  color={DiscordColors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleStartVideoCall}
                style={styles.actionBtn}
              >
                <Ionicons
                  name="videocam"
                  size={24}
                  color={DiscordColors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Alert.alert('Search', 'Search feature coming soon!')}
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
                {otherUser && (
                  <>
                    <UserAvatarWithActions
                      user={{
                        id: otherUser.id,
                        username: otherUser.username,
                        displayName: otherUser.displayName,
                        avatar: otherUser.avatar,
                        status: otherUser.status,
                        bio: otherUser.bio,
                        avatarEffectId: otherUser.avatarEffectId,
                        bannerEffectId: otherUser.bannerEffectId,
                        cardEffectId: otherUser.cardEffectId,
                      }}
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
            replyToMessage={
              replyingToMessage
                ? {
                    id: replyingToMessage.id,
                    content: replyingToMessage.content,
                    attachments: replyingToMessage.attachments,
                    sender: {
                      id: replyingToMessage.sender.id,
                      username: replyingToMessage.sender.username,
                      displayName: replyingToMessage.sender.displayName,
                    },
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

      <VoiceCallUI
        visible={voiceCallVisible}
        autoStart={shouldAutoStartCall}
        conversationId={conversationId || ''}
        callType={callType}
        remoteUserName={otherUser?.displayName || otherUser?.username || 'Unknown'}
        remoteUserAvatar={otherUser?.avatar}
        remoteUserId={otherUser?.id}
        remoteAvatarEffectId={otherUser?.avatarEffectId}
        remoteBannerEffectId={otherUser?.bannerEffectId}
        remoteCardEffectId={otherUser?.cardEffectId}
        onLeave={handleLeaveCall}
        onMinimize={handleLeaveCall}
        onAutoStartHandled={() => setShouldAutoStartCall(false)}
        activeCall={activeCall}
        isInCall={isInCall}
        isRemoteSpeaking={isRemoteSpeaking}
        isLocalSpeaking={isLocalSpeaking}
        handleStartCall={startDmCall}
        handleEndCall={handleEndCall}
        handleToggleMute={handleToggleMute}
        handleToggleDeafen={handleToggleDeafen}
        handleToggleCamera={handleToggleCamera}
        handleSwitchCamera={handleSwitchCamera}
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
  headerNameplate: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
    zIndex: -1,
  },
});
