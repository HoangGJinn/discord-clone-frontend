import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
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
  deleteServer,
  leaveServer,
  ServerDetailsResponse,
  ServerResponse,
  getServerDetails,
  updateServer,
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

  const [showRenameServerModal, setShowRenameServerModal] = useState(false);
  const [serverToRename, setServerToRename] = useState<ServerResponse | null>(null);
  const [renameServerName, setRenameServerName] = useState('');
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [showServerOptionsModal, setShowServerOptionsModal] = useState(false);
  const [selectedServerForOptions, setSelectedServerForOptions] = useState<ServerResponse | null>(null);
  const [isServerActionLoading, setIsServerActionLoading] = useState(false);

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

  const handleServerLongPress = useCallback(
    (server: ServerResponse) => {
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
  const selectedServerUserId = Number(user?.id);
  const selectedServerIsOwner = Boolean(selectedServerForOptions) &&
    Boolean(user?.id) &&
    Number.isFinite(selectedServerUserId) &&
    selectedServerForOptions?.ownerId === selectedServerUserId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ServerSidebar
          servers={servers}
          activeServerId={activeServerId}
          isLoading={isLoadingServers}
          onServerPress={handleServerPress}
          onServerLongPress={handleServerLongPress}
          onCreateServerPress={() => setShowCreateModal(true)}
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title} numberOfLines={1}>
                {serverTitle}
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
