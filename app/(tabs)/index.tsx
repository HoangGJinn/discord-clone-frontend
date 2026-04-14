import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
  ServerDetailsResponse,
  ServerResponse,
  getServerDetails,
} from '@/services/serverService';
import { ServerChannelList } from '@/components/server/ServerChannelList';
import { CreateCategoryModal } from '@/components/server/CreateCategoryModal';
import { CreateChannelModal } from '@/components/server/CreateChannelModal';
import { useAuthStore } from '@/store/useAuthStore';
import socketService from '@/services/socketService';

interface VoiceSocketMessage {
  type?: 'JOIN' | 'LEAVE' | 'UPDATE_STATE' | 'INITIAL_SYNC';
  state?: {
    channelId?: number;
  };
  states?: {
    channelId?: number;
  }[];
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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeServerDetails, setActiveServerDetails] = useState<ServerDetailsResponse | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [isLoadingServerDetails, setIsLoadingServerDetails] = useState(false);
  const [voiceChannelCounts, setVoiceChannelCounts] = useState<Record<number, number>>({});

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);

  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelResponse | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      void fetchServers();
    }, [fetchServers]),
  );

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

    const subscribeVoice = async () => {
      await socketService.subscribe<VoiceSocketMessage>(destination, (message) => {
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
      });
    };

    void subscribeVoice();

    return () => {
      socketService.unsubscribe(destination);
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

  const handleServerPress = useCallback(
    (server: ServerResponse) => {
      setActiveServerId(server.id);
    },
    [setActiveServerId],
  );

  const handleChannelPress = useCallback(
    (channel: ChannelResponse) => {
      setActiveChannelId(channel.id);

      if (channel.type === 'VOICE') {
        router.push({
          pathname: '/voice/[channelId]',
          params: { channelId: String(channel.id) },
        });
        return;
      }

      router.push({
        pathname: '/channel/[channelId]',
        params: { channelId: String(channel.id) },
      });
    },
    [router],
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

  const serverTitle = activeServerDetails?.name || activeServer?.name || 'Discord';
  const serverSubtitle = activeServerDetails
    ? activeServerDetails.description?.trim() || 'Channel overview for this server.'
    : 'Select a server to view categories and channels.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <ServerSidebar
          servers={servers}
          activeServerId={activeServerId}
          isLoading={isLoadingServers}
          onServerPress={handleServerPress}
          onCreateServerPress={() => setShowCreateModal(true)}
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title} numberOfLines={1}>
                {serverTitle}
              </ThemedText>
              <ThemedText style={styles.subtitle} numberOfLines={1}>
                {serverSubtitle}
              </ThemedText>
            </View>
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

          <View style={styles.panel}>
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
          </View>
        </View>
      </View>

      <CreateServerModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <CreateCategoryModal
        visible={showCategoryModal}
        serverId={activeServerId}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: DiscordColors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: DiscordColors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  panel: {
    flex: 1,
    backgroundColor: DiscordColors.secondaryBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    overflow: 'hidden',
  },
  errorCard: {
    backgroundColor: 'rgba(242, 63, 67, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(242, 63, 67, 0.4)',
    borderRadius: 10,
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
});
