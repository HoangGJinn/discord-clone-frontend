import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { useServerStore } from '@/store/useServerStore';
import { ServerSidebar } from '@/components/server/ServerSidebar';
import { CreateServerModal } from '@/components/server/CreateServerModal';
import {
  ChannelResponse,
  CategoryResponse,
  deleteCategory,
  deleteChannel,
  deleteServer,
  leaveServer,
  ServerDetailsResponse,
  ServerResponse,
  getServerDetails,
  uploadFile,
  updateServer,
} from '@/services/serverService';
import { ServerChannelList } from '@/components/server/ServerChannelList';
import { CreateCategoryModal } from '@/components/server/CreateCategoryModal';
import { CreateChannelModal } from '@/components/server/CreateChannelModal';
import { InviteModal } from '@/components/server/InviteModal';
import { JoinServerModal } from '@/components/server/JoinServerModal';
import { useAuthStore } from '@/store/useAuthStore';
import socketService from '@/services/socketService';
import { useDMStore } from '@/store/useDMStore';
import { ConversationItem } from '@/components/ConversationItem';
import { Conversation, getOtherParticipant } from '@/types/dm';
import { isImageAttachment } from '@/utils/attachments';

interface VoiceSocketMessage {
  type?: 'JOIN' | 'LEAVE' | 'UPDATE_STATE' | 'INITIAL_SYNC';
  state?: {
    channelId?: number;
  };
  states?: {
    channelId?: number;
  }[];
}

function buildLastMessagePreview(conversation: Conversation) {
  const lastMessage = conversation.lastMessage;
  if (!lastMessage) return undefined;

  const content = (lastMessage.content || '').trim();
  if (content) {
    return content;
  }

  const attachments = lastMessage.attachments || [];
  if (!attachments.length) {
    return undefined;
  }

  const hasGiftAttachment = attachments.some((attachment) => {
    const filename = (attachment.filename || '').toLowerCase();
    const contentType = (attachment.contentType || '').toLowerCase();
    const url = (attachment.url || '').toLowerCase();
    return (
      filename.includes('gift') ||
      contentType.includes('gift') ||
      url.includes('gift')
    );
  });

  if (hasGiftAttachment) {
    return 'Sent a gift';
  }

  const hasImage = attachments.some((attachment) => isImageAttachment(attachment));
  if (hasImage && attachments.length === 1) {
    return 'Photo';
  }
  if (hasImage) {
    return `${attachments.length} attachments`;
  }
  return attachments.length === 1 ? 'File' : `${attachments.length} files`;
}

export default function HomeScreen() {
  const router = useRouter();
  const servers = useServerStore((state) => state.servers);
  const activeServerId = useServerStore((state) => state.activeServerId);
  const isLoadingServers = useServerStore((state) => state.isLoadingServers);
  const error = useServerStore((state) => state.error);
  const fetchServers = useServerStore((state) => state.fetchServers);
  const setActiveServerId = useServerStore((state) => state.setActiveServerId);
  const clearError = useServerStore((state) => state.clearError);
  const user = useAuthStore((state) => state.user);
  const conversations = useDMStore((state) => state.conversations);
  const isLoadingConversations = useDMStore((state) => state.isLoadingConversations);
  const fetchConversations = useDMStore((state) => state.fetchConversations);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeServerDetails, setActiveServerDetails] = useState<ServerDetailsResponse | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [isLoadingServerDetails, setIsLoadingServerDetails] = useState(false);
  const [voiceChannelCounts, setVoiceChannelCounts] = useState<Record<number, number>>({});
  const [isDmPanelActive, setIsDmPanelActive] = useState(true);
  const [dmSearchQuery, setDmSearchQuery] = useState('');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);

  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelResponse | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState<number | null>(null);

  const [showRenameServerModal, setShowRenameServerModal] = useState(false);
  const [serverToRename, setServerToRename] = useState<ServerResponse | null>(null);
  const [renameServerName, setRenameServerName] = useState('');
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [showServerOptionsModal, setShowServerOptionsModal] = useState(false);
  const [selectedServerForOptions, setSelectedServerForOptions] = useState<ServerResponse | null>(null);
  const [isServerActionLoading, setIsServerActionLoading] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isUpdatingServerIcon, setIsUpdatingServerIcon] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void fetchServers();
    }, [fetchServers]),
  );

  useEffect(() => {
    if (!isDmPanelActive) {
      return;
    }

    void fetchConversations();
  }, [fetchConversations, isDmPanelActive]);

  useEffect(() => {
    const loadServerDetails = async () => {
      if (!activeServerId) {
        setActiveServerDetails(null);
        setActiveChannelId(null);
        setVoiceChannelCounts({});
        return;
      }

      setIsLoadingServerDetails(true);
      try {
        const details = await getServerDetails(activeServerId);
        setActiveServerDetails(details);

        const sortedCategories = [...(details.categories || [])].sort(
          (left, right) => (left.position ?? 0) - (right.position ?? 0),
        );
        const firstCategoryChannel = sortedCategories
          .flatMap((category) => category.channels || [])
          .find((channel) => channel.type === 'TEXT');
        const firstUncategorizedTextChannel = (details.channels || []).find(
          (channel) => channel.type === 'TEXT',
        );
        const nextActiveChannel = firstCategoryChannel || firstUncategorizedTextChannel || null;

        setActiveChannelId(nextActiveChannel?.id ?? null);
      } catch {
        setActiveServerDetails(null);
        setActiveChannelId(null);
        setVoiceChannelCounts({});
      } finally {
        setIsLoadingServerDetails(false);
      }
    };

    void loadServerDetails();
  }, [activeServerId]);

  useEffect(() => {
    if (!activeServerId) {
      return;
    }

    const destination = `/topic/server/${activeServerId}/voice`;
    const onVoiceMessage = (message: VoiceSocketMessage) => {
      if (message.type === 'INITIAL_SYNC' && Array.isArray(message.states)) {
        const nextCounts: Record<number, number> = {};
        for (const state of message.states) {
          const channelId = state.channelId;
          if (!channelId) continue;
          nextCounts[channelId] = (nextCounts[channelId] || 0) + 1;
        }
        setVoiceChannelCounts(nextCounts);
        return;
      }

      if (message.type === 'LEAVE' && message.state?.channelId) {
        setVoiceChannelCounts((current) => {
          const channelId = message.state?.channelId as number;
          const currentCount = current[channelId] || 0;
          return {
            ...current,
            [channelId]: Math.max(currentCount - 1, 0),
          };
        });
      }
    };

    const subscribeVoice = async () => {
      await socketService.subscribe<VoiceSocketMessage>(destination, onVoiceMessage);
    };

    void subscribeVoice();

    return () => {
      socketService.unsubscribe(destination, onVoiceMessage);
    };
  }, [activeServerId]);

  const myRole = useMemo(() => {
    if (!activeServerDetails || !user?.id) {
      return null;
    }

    const userId = Number(user.id);
    if (activeServerDetails.ownerId === userId) {
      return 'OWNER';
    }

    const memberRole = activeServerDetails.members?.find(
      (member) => member.userId === userId,
    )?.role;

    return memberRole ?? null;
  }, [activeServerDetails, user?.id]);

  const isManager = myRole === 'OWNER' || myRole === 'ADMIN';

  const activeServer = useMemo(
    () => servers.find((server) => server.id === activeServerId) || null,
    [servers, activeServerId],
  );

  const filteredConversations = useMemo(() => {
    if (!user) {
      return conversations;
    }

    const query = dmSearchQuery.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (!conversation) return false;

      if (!query) {
        return true;
      }

      const other = getOtherParticipant(conversation, user.id);
      const name = (other.displayName || other.username || '').toLowerCase();
      return name.includes(query);
    });
  }, [conversations, dmSearchQuery, user]);

  const handleOpenConversation = useCallback(
    (conversationId: string) => {
      router.push(`/dm/${conversationId}` as any);
    },
    [router],
  );

  const handleServerPress = useCallback(
    (server: ServerResponse) => {
      setIsDmPanelActive(false);
      setActiveServerId(server.id);
    },
    [setActiveServerId],
  );

  const handleServerLongPress = useCallback(
    (server: ServerResponse) => {
      setIsDmPanelActive(false);
      setActiveServerId(server.id);
      setSelectedServerForOptions(server);
      setShowServerOptionsModal(true);
    },
    [setActiveServerId],
  );

  const handleOpenRenameServer = useCallback(() => {
    if (!selectedServerForOptions) return;
    setServerToRename(selectedServerForOptions);
    setRenameServerName(selectedServerForOptions.name);
    setShowServerOptionsModal(false);
    setShowRenameServerModal(true);
  }, [selectedServerForOptions]);

  const handleDeleteServerFromOptions = useCallback(async () => {
    if (!selectedServerForOptions) return;

    Alert.alert(
      'Delete server',
      `Delete "${selectedServerForOptions.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsServerActionLoading(true);
            try {
              await deleteServer(selectedServerForOptions.id);

              setShowServerOptionsModal(false);
              setSelectedServerForOptions(null);
              await fetchServers();
            } catch {
              Alert.alert('Error', 'Could not delete server.');
            } finally {
              setIsServerActionLoading(false);
            }
          },
        },
      ],
    );
  }, [fetchServers, selectedServerForOptions]);

  const handlePickServerAvatar = useCallback(async () => {
    if (!selectedServerForOptions || isUpdatingServerIcon) {
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow photo library access to change server avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      setIsUpdatingServerIcon(true);
      const asset = result.assets[0];
      const uploadedUrl = await uploadFile({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || `server-icon-${selectedServerForOptions.id}.jpg`,
      });

      await updateServer(selectedServerForOptions.id, {
        iconUrl: uploadedUrl,
      });
      await fetchServers();

      if (activeServerId === selectedServerForOptions.id) {
        const details = await getServerDetails(selectedServerForOptions.id);
        setActiveServerDetails(details);
      }

      setShowServerOptionsModal(false);
      setSelectedServerForOptions(null);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update server avatar.');
    } finally {
      setIsUpdatingServerIcon(false);
    }
  }, [activeServerId, fetchServers, isUpdatingServerIcon, selectedServerForOptions]);

  const handleClearServerAvatar = useCallback(() => {
    if (!selectedServerForOptions || isUpdatingServerIcon) {
      return;
    }

    void (async () => {
      try {
        setIsUpdatingServerIcon(true);
        await updateServer(selectedServerForOptions.id, { iconUrl: '' });
        await fetchServers();

        if (activeServerId === selectedServerForOptions.id) {
          const details = await getServerDetails(selectedServerForOptions.id);
          setActiveServerDetails(details);
        }
      } catch {
        Alert.alert('Error', 'Could not clear server avatar.');
      } finally {
        setIsUpdatingServerIcon(false);
      }
    })();

    setShowServerOptionsModal(false);
    setSelectedServerForOptions(null);
  }, [activeServerId, fetchServers, isUpdatingServerIcon, selectedServerForOptions]);

  const handleLeaveServerFromOptions = useCallback(async () => {
    if (!selectedServerForOptions) return;

    Alert.alert(
      'Leave server',
      `Leave "${selectedServerForOptions.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setIsServerActionLoading(true);
            try {
              await leaveServer(selectedServerForOptions.id);
              setShowServerOptionsModal(false);
              setSelectedServerForOptions(null);
              await fetchServers();
            } catch {
              Alert.alert('Error', 'Could not leave server.');
            } finally {
              setIsServerActionLoading(false);
            }
          },
        },
      ],
    );
  }, [fetchServers, selectedServerForOptions]);

  const submitRenameServer = useCallback(async () => {
    if (!serverToRename) return;

    const trimmed = renameServerName.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      Alert.alert('Invalid name', 'Server name must be between 2 and 100 characters.');
      return;
    }

    setIsSavingServer(true);
    try {
      await updateServer(serverToRename.id, { name: trimmed });
      setShowRenameServerModal(false);
      setServerToRename(null);
      setRenameServerName('');
      await fetchServers();
      const details = await getServerDetails(serverToRename.id);
      setActiveServerDetails(details);
    } catch {
      Alert.alert('Error', 'Could not rename server.');
    } finally {
      setIsSavingServer(false);
    }
  }, [fetchServers, renameServerName, serverToRename]);

  const handleChannelPress = useCallback(
    (channel: ChannelResponse) => {
      setActiveChannelId(channel.id);

      if (channel.type === 'VOICE') {
        router.push({
          pathname: '/voice/[channelId]',
          params: {
            channelId: String(channel.id),
            channelName: channel.name,
            serverId: String(activeServerId ?? channel.serverId),
          },
        });
        return;
      }

      router.push({
        pathname: '/channel/[channelId]',
        params: { channelId: String(channel.id) },
      });
    },
    [router, activeServerId],
  );

  const refreshServerDetails = useCallback(async () => {
    if (!activeServerId) return;
    try {
      const details = await getServerDetails(activeServerId);
      setActiveServerDetails(details);
    } catch {
      // No-op, existing state remains visible.
    }
  }, [activeServerId]);

  const openCreateCategory = useCallback(() => {
    if (!isManager) return;
    setEditingCategory(null);
    setShowCategoryModal(true);
  }, [isManager]);

  const openEditCategory = useCallback(
    (category: CategoryResponse) => {
      if (!isManager) return;
      setEditingCategory(category);
      setShowCategoryModal(true);
    },
    [isManager],
  );

  const handleDeleteCategory = useCallback(
    (category: CategoryResponse) => {
      if (!isManager) return;

      Alert.alert('Delete category', `Delete "${category.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
              await refreshServerDetails();
            } catch {
              Alert.alert('Error', 'Could not delete category.');
            }
          },
        },
      ]);
    },
    [isManager, refreshServerDetails],
  );

  const openCreateChannel = useCallback(
    (categoryId: number | null) => {
      if (!isManager) return;
      setEditingChannel(null);
      setDefaultCategoryId(categoryId);
      setShowChannelModal(true);
    },
    [isManager],
  );

  const openEditChannel = useCallback(
    (channel: ChannelResponse) => {
      if (!isManager) return;
      setEditingChannel(channel);
      setDefaultCategoryId(channel.categoryId ?? null);
      setShowChannelModal(true);
    },
    [isManager],
  );

  const handleDeleteChannel = useCallback(
    (channel: ChannelResponse) => {
      if (!isManager) return;

      Alert.alert('Delete channel', `Delete #${channel.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChannel(channel.id);
              await refreshServerDetails();
            } catch {
              Alert.alert('Error', 'Could not delete channel.');
            }
          },
        },
      ]);
    },
    [isManager, refreshServerDetails],
  );

  const handleInviteCodeChanged = useCallback((newCode: string) => {
    setActiveServerDetails((prev) => {
      if (!prev) return prev;
      return { ...prev, inviteCode: newCode };
    });
  }, []);

  const serverTitle = activeServerDetails?.name || activeServer?.name || 'Discord';
  const dmTitle = 'Friends';
  const selectedServerUserId = Number(user?.id);
  const selectedServerIsOwner = Boolean(selectedServerForOptions) &&
    Boolean(user?.id) &&
    Number.isFinite(selectedServerUserId) &&
    selectedServerForOptions?.ownerId === selectedServerUserId;

  const renderDmConversationItem = useCallback(
    ({ item, index }: { item: Conversation; index: number }) => {
      if (!user) return null;

      const other = getOtherParticipant(item, user.id);

      return (
        <ConversationItem
          participant={other}
          lastMessageContent={buildLastMessagePreview(item)}
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
    },
    [handleOpenConversation, user],
  );

  const dmConversationKey = useCallback(
    (item: Conversation, index: number) => item.id || `dm-${index}`,
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ServerSidebar
          servers={servers}
          activeServerId={isDmPanelActive ? null : activeServerId}
          isDirectMessagesActive={isDmPanelActive}
          isLoading={isLoadingServers}
          onServerPress={handleServerPress}
          onServerLongPress={handleServerLongPress}
          onCreateServerPress={() => setShowCreateModal(true)}
          onDirectMessagesPress={() => setIsDmPanelActive(true)}
        />

        <View style={styles.content}>
          {isDmPanelActive ? (
            <>
              <View style={styles.header}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <ThemedText style={styles.title} numberOfLines={1}>
                    {dmTitle}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.searchRow}>
                <View style={styles.searchPill}>
                  <Ionicons name="search" size={18} color={DiscordColors.textMuted} />
                  <TextInput
                    style={styles.dmSearchInput}
                    placeholder="Find or start a conversation"
                    placeholderTextColor={DiscordColors.textMuted}
                    value={dmSearchQuery}
                    onChangeText={setDmSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>

                <Pressable
                  style={styles.dmAddFriendButton}
                  onPress={() => router.push('/friends/add')}
                >
                  <Ionicons name="person-add" size={20} color="#fff" />
                </Pressable>
              </View>

              <View style={styles.dmListContainer}>
                <FlatList
                  data={filteredConversations}
                  renderItem={renderDmConversationItem}
                  keyExtractor={dmConversationKey}
                  refreshControl={(
                    <RefreshControl
                      refreshing={isLoadingConversations}
                      onRefresh={fetchConversations}
                      tintColor={DiscordColors.blurple}
                    />
                  )}
                  ListEmptyComponent={(
                    <View style={styles.dmEmptyContainer}>
                      <Ionicons
                        name="chatbubbles-outline"
                        size={54}
                        color={DiscordColors.textMuted}
                      />
                      <ThemedText style={styles.dmEmptyTitle}>No messages yet</ThemedText>
                      <ThemedText style={styles.dmEmptySubtitle}>
                        Start a conversation from your friends list.
                      </ThemedText>
                    </View>
                  )}
                  contentContainerStyle={filteredConversations.length === 0 ? styles.dmEmptyList : undefined}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <ThemedText style={styles.title} numberOfLines={1}>
                    {serverTitle}
                  </ThemedText>
                </View>
                {activeServerDetails ? (
                  <Pressable
                    style={styles.inviteHeaderButton}
                    onPress={() => setShowInviteModal(true)}
                  >
                    <Ionicons name="person-add" size={18} color="#fff" />
                  </Pressable>
                ) : null}
              </View>

              {error ? (
                <Pressable
                  style={styles.errorCard}
                  onPress={() => {
                    clearError();
                    void fetchServers();
                  }}
                >
                  <Ionicons name="alert-circle" size={16} color={DiscordColors.red} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                  <ThemedText style={styles.errorRetry}>Tap to retry</ThemedText>
                </Pressable>
              ) : null}

              <View style={styles.searchRow}>
                <View style={styles.searchPill}>
                  <Ionicons name="search" size={18} color={DiscordColors.textMuted} />
                  <ThemedText style={styles.searchText}>Search</ThemedText>
                </View>

                <Pressable
                  style={styles.iconButton}
                  onPress={() => setShowJoinModal(true)}
                >
                  <Ionicons name="enter-outline" size={18} color={DiscordColors.textSecondary} />
                </Pressable>

                <Pressable
                  style={styles.iconButton}
                  onPress={() => {
                    if (!activeServerId) return;
                    router.push({
                      pathname: '/server/[serverId]/members',
                      params: { serverId: String(activeServerId) },
                    });
                  }}
                >
                  <Ionicons name="people" size={18} color={DiscordColors.textSecondary} />
                </Pressable>
              </View>

              <ServerChannelList
                serverDetails={activeServerDetails}
                activeChannelId={activeChannelId}
                isLoading={isLoadingServerDetails}
                isManager={isManager}
                voiceChannelCounts={voiceChannelCounts}
                onChannelPress={handleChannelPress}
                onAddCategory={openCreateCategory}
                onAddChannel={openCreateChannel}
                onEditCategory={openEditCategory}
                onDeleteCategory={handleDeleteCategory}
                onEditChannel={openEditChannel}
                onDeleteChannel={handleDeleteChannel}
              />
            </>
          )}
        </View>
      </View>

      <CreateServerModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <Modal
        visible={showServerOptionsModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (isServerActionLoading) return;
          setShowServerOptionsModal(false);
          setSelectedServerForOptions(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (isServerActionLoading) return;
            setShowServerOptionsModal(false);
            setSelectedServerForOptions(null);
          }}
        >
          <Pressable style={styles.serverOptionsCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Server Options</ThemedText>
            </View>

            <View style={styles.serverInfoBlock}>
              <ThemedText style={styles.serverInfoName} numberOfLines={1}>
                {selectedServerForOptions?.name || 'Server'}
              </ThemedText>
              <ThemedText style={styles.serverInfoMeta}>
                {`${selectedServerForOptions?.memberCount ?? 0} members`}
              </ThemedText>
              <ThemedText style={styles.serverInfoMeta}>
                {`${selectedServerForOptions?.channelCount ?? 0} channels`}
              </ThemedText>
            </View>

            <View style={styles.serverOptionsActions}>
              <Pressable
                style={styles.serverOptionButton}
                onPress={() => {
                  if (!selectedServerForOptions) return;
                  setShowServerOptionsModal(false);
                  router.push({
                    pathname: '/server/[serverId]/members',
                    params: { serverId: String(selectedServerForOptions.id) },
                  });
                }}
              >
                <Ionicons name="people-outline" size={18} color={DiscordColors.textSecondary} />
                <ThemedText style={styles.serverOptionText}>View Members</ThemedText>
              </Pressable>

              {selectedServerIsOwner ? (
                <>
                  <Pressable
                    style={styles.serverOptionButton}
                    onPress={() => {
                      void handlePickServerAvatar();
                    }}
                    disabled={isUpdatingServerIcon || isServerActionLoading}
                  >
                    <Ionicons name="image-outline" size={18} color={DiscordColors.textSecondary} />
                    <ThemedText style={styles.serverOptionText}>Change Server Avatar</ThemedText>
                  </Pressable>

                  <Pressable
                    style={styles.serverOptionButton}
                    onPress={handleClearServerAvatar}
                    disabled={isUpdatingServerIcon || isServerActionLoading}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={DiscordColors.textSecondary} />
                    <ThemedText style={styles.serverOptionText}>Clear Server Avatar</ThemedText>
                  </Pressable>

                  <Pressable style={styles.serverOptionButton} onPress={handleOpenRenameServer}>
                    <Ionicons name="pencil-outline" size={18} color={DiscordColors.textSecondary} />
                    <ThemedText style={styles.serverOptionText}>Rename Server</ThemedText>
                  </Pressable>

                  <Pressable
                    style={[styles.serverOptionButton, styles.serverOptionDanger]}
                    onPress={() => {
                      void handleDeleteServerFromOptions();
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={DiscordColors.red} />
                    <ThemedText style={styles.serverOptionDangerText}>Delete Server</ThemedText>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[styles.serverOptionButton, styles.serverOptionDanger]}
                  onPress={() => {
                    void handleLeaveServerFromOptions();
                  }}
                >
                  <Ionicons name="exit-outline" size={18} color={DiscordColors.red} />
                  <ThemedText style={styles.serverOptionDangerText}>Leave Server</ThemedText>
                </Pressable>
              )}
            </View>

            {isServerActionLoading ? (
              <View style={styles.serverOptionsLoadingRow}>
                <ActivityIndicator size="small" color={DiscordColors.textSecondary} />
              </View>
            ) : isUpdatingServerIcon ? (
              <View style={styles.serverOptionsLoadingRow}>
                <ActivityIndicator size="small" color={DiscordColors.textSecondary} />
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showRenameServerModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (isSavingServer) return;
          setShowRenameServerModal(false);
          setServerToRename(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Rename Server</ThemedText>
            </View>
            <View style={styles.modalBody}>
              <ThemedText style={styles.modalLabel}>SERVER NAME</ThemedText>
              <TextInput
                style={styles.modalInput}
                value={renameServerName}
                onChangeText={setRenameServerName}
                placeholder="My Server"
                placeholderTextColor={DiscordColors.textMuted}
                maxLength={100}
                autoFocus
                editable={!isSavingServer}
              />
            </View>
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => {
                  if (isSavingServer) return;
                  setShowRenameServerModal(false);
                  setServerToRename(null);
                }}
              >
                <ThemedText style={styles.modalBtnSecondaryText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary, isSavingServer && styles.modalBtnDisabled]}
                onPress={submitRenameServer}
                disabled={isSavingServer}
              >
                {isSavingServer ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.modalBtnPrimaryText}>Save</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CreateCategoryModal
        visible={showCategoryModal}
        serverId={activeServerId}
        categories={activeServerDetails?.categories || []}
        editingCategory={editingCategory}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        onSuccess={() => {
          void refreshServerDetails();
        }}
      />

      <CreateChannelModal
        visible={showChannelModal}
        serverId={activeServerId}
        categories={activeServerDetails?.categories || []}
        defaultCategoryId={defaultCategoryId}
        editingChannel={editingChannel}
        onClose={() => {
          setShowChannelModal(false);
          setEditingChannel(null);
          setDefaultCategoryId(null);
        }}
        onSuccess={() => {
          void refreshServerDetails();
        }}
      />

      <InviteModal
        visible={showInviteModal}
        serverDetails={activeServerDetails}
        isManager={isManager}
        onClose={() => setShowInviteModal(false)}
        onInviteCodeChanged={handleInviteCodeChanged}
      />

      <JoinServerModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
    paddingTop: Spacing.md,
    paddingHorizontal: 0,
    paddingBottom: 0,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  title: {
    color: DiscordColors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  inviteHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DiscordColors.blurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  searchPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: DiscordColors.tertiaryBackground,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  searchText: {
    color: DiscordColors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  dmSearchInput: {
    flex: 1,
    color: DiscordColors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  dmAddFriendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DiscordColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmListContainer: {
    flex: 1,
    backgroundColor: DiscordColors.secondaryBackground,
  },
  dmEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 88,
    paddingHorizontal: Spacing.lg,
  },
  dmEmptyTitle: {
    marginTop: Spacing.md,
    color: DiscordColors.textSecondary,
    fontSize: 17,
    fontWeight: '700',
  },
  dmEmptySubtitle: {
    marginTop: Spacing.xs,
    color: DiscordColors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  dmEmptyList: {
    flexGrow: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledIconButton: {
    opacity: 0.45,
  },
  errorCard: {
    backgroundColor: 'rgba(242, 63, 67, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(242, 63, 67, 0.4)',
    borderRadius: 10,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    color: DiscordColors.textPrimary,
    fontSize: 13,
  },
  errorRetry: {
    color: DiscordColors.textMuted,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalCard: {
    backgroundColor: DiscordColors.secondaryBackground,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.lg,
  },
  serverOptionsCard: {
    backgroundColor: DiscordColors.secondaryBackground,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.lg,
    minHeight: '45%',
  },
  serverInfoBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: 4,
  },
  serverInfoName: {
    color: DiscordColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  serverInfoMeta: {
    color: DiscordColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  serverOptionsActions: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  serverOptionButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: DiscordColors.tertiaryBackground,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  serverOptionText: {
    color: DiscordColors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  serverOptionDanger: {
    borderColor: 'rgba(242, 63, 67, 0.45)',
  },
  serverOptionDangerText: {
    color: DiscordColors.red,
    fontSize: 14,
    fontWeight: '700',
  },
  serverOptionsLoadingRow: {
    marginTop: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DiscordColors.divider,
  },
  modalTitle: {
    color: DiscordColors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  modalLabel: {
    color: DiscordColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    color: DiscordColors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalBtnSecondary: {
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  modalBtnPrimary: {
    backgroundColor: DiscordColors.blurple,
  },
  modalBtnDisabled: {
    opacity: 0.7,
  },
  modalBtnSecondaryText: {
    color: DiscordColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
