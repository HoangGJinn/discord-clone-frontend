import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ConversationItem } from '@/components/ConversationItem';
import { useDMStore } from '@/store/useDMStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Conversation, getOtherParticipant } from '@/types/dm';
import { DiscordColors, Spacing } from '@/constants/theme';

// ─── Screen (SRP: Composes components and connects to store) ─
export default function MessagesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const user = useAuthStore((s) => s.user);
  const {
    conversations,
    isLoadingConversations,
    fetchConversations,
  } = useDMStore();

  // ── Load conversations on mount ────────────────────────
  useEffect(() => {
    fetchConversations();
  }, []);

  // ── Filter conversations by search query ───────────────
  const filteredConversations = conversations.filter((conv) => {
    // Robust check: Skip invalid or empty conversations
    if (!conv) return false;
    if (!conv.participantOne && !conv.participantTwo) return false;
    
    if (!searchQuery.trim() || !user) return true;
    
    try {
      const other = getOtherParticipant(conv, user.id);
      const name = (other.displayName || other.username || '').toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    } catch (err) {
      console.warn('Error filtering conversation:', conv.id, err);
      return false;
    }
  });

  // ── Navigation handler ─────────────────────────────────
  const handleOpenConversation = useCallback(
    (conversationId: string) => {
      router.push(`/dm/${conversationId}` as any);
    },
    [router],
  );

  // ── Render item (pure function) ────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: Conversation; index: number }) => {
      if (!user || !item) return null;
      
      try {
        const other = getOtherParticipant(item, user.id);

        return (
          <ConversationItem
            participant={other}
            lastMessageContent={item.lastMessage?.content}
            lastMessageSender={
              item.lastMessage
                ? String(item.lastMessage.sender?.id) === String(user.id)
                  ? 'You'
                  : item.lastMessage.sender?.username || 'User'
                : undefined
            }
            lastMessageTime={item.lastMessage?.createdAt || item.updatedAt}
            unreadCount={item.unreadCount}
            onPress={() => handleOpenConversation(item.id)}
            index={index}
          />
        );
      } catch (err) {
        console.error('Error rendering conversation item:', item.id, err);
        return null;
      }
    },
    [user, handleOpenConversation],
  );

  const keyExtractor = useCallback(
    (item: Conversation, index: number) => item?.id || `index-${index}`,
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Messages</ThemedText>
        <TouchableOpacity style={styles.newDmBtn} activeOpacity={0.7}>
          <Ionicons
            name="create-outline"
            size={24}
            color={DiscordColors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={styles.searchContainer}
      >
        <Ionicons
          name="search"
          size={18}
          color={DiscordColors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={DiscordColors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons
              name="close-circle"
              size={18}
              color={DiscordColors.textMuted}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Conversation list */}
      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingConversations}
            onRefresh={fetchConversations}
            tintColor={DiscordColors.blurple}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="chatbubbles-outline"
              size={64}
              color={DiscordColors.textMuted}
            />
            <ThemedText style={styles.emptyTitle}>
              No messages yet
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Start a conversation with a friend!
            </ThemedText>
          </View>
        }
        contentContainerStyle={
          filteredConversations.length === 0 && styles.emptyList
        }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: DiscordColors.textPrimary,
  },
  newDmBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DiscordColors.tertiaryBackground,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: DiscordColors.textPrimary,
    padding: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DiscordColors.textSecondary,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DiscordColors.textMuted,
    marginTop: Spacing.xs,
  },
  emptyList: {
    flexGrow: 1,
  },
});
