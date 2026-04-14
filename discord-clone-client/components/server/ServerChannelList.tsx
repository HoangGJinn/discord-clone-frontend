import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import {
  ChannelResponse,
  CategoryResponse,
  ServerDetailsResponse,
} from '@/services/serverService';
import { DiscordColors, Spacing } from '@/constants/theme';

interface ServerChannelListProps {
  serverDetails: ServerDetailsResponse | null;
  activeChannelId?: number | null;
  isLoading?: boolean;
  isManager?: boolean;
  voiceChannelCounts?: Record<number, number>;
  onChannelPress: (channel: ChannelResponse) => void;
  onAddCategory?: () => void;
  onAddChannel?: (categoryId: number | null) => void;
  onEditCategory?: (category: CategoryResponse) => void;
  onDeleteCategory?: (category: CategoryResponse) => void;
  onEditChannel?: (channel: ChannelResponse) => void;
  onDeleteChannel?: (channel: ChannelResponse) => void;
}

const sortByPosition = <T extends { position?: number }>(items: T[]) =>
  [...items].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));

const ChannelRow = ({
  channel,
  active,
  isManager,
  voiceCount,
  onPress,
  onEdit,
  onDelete,
}: {
  channel: ChannelResponse;
  active: boolean;
  isManager: boolean;
  voiceCount: number;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => {
  const isVoice = channel.type === 'VOICE';
  const voiceMeta = isVoice
    ? channel.userLimit && channel.userLimit > 0
      ? `${voiceCount}/${channel.userLimit}`
      : String(voiceCount)
    : null;

  const handleLongPress = () => {
    if (!isManager || !onEdit || !onDelete) return;

    Alert.alert(`Manage #${channel.name}`, 'Choose an action for this channel.', [
      { text: 'Edit', onPress: onEdit },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={260}
      style={({ pressed }) => [
        styles.channelRow,
        active && styles.channelRowActive,
        pressed && styles.channelRowPressed,
      ]}
    >
      {isVoice ? (
        <Ionicons
          name="volume-high-outline"
          size={16}
          color={active ? DiscordColors.textPrimary : DiscordColors.textMuted}
          style={styles.channelIcon}
        />
      ) : (
        <ThemedText style={[styles.channelHash, active && styles.channelNameActive]}>
          #
        </ThemedText>
      )}
      <ThemedText style={[styles.channelName, active && styles.channelNameActive]}>
        {channel.name}
      </ThemedText>
      {voiceMeta ? <ThemedText style={styles.voiceMeta}>{voiceMeta}</ThemedText> : null}
    </Pressable>
  );
};

export function ServerChannelList({
  serverDetails,
  activeChannelId,
  isLoading = false,
  isManager = false,
  voiceChannelCounts = {},
  onChannelPress,
  onAddCategory,
  onAddChannel,
  onEditCategory,
  onDeleteCategory,
  onEditChannel,
  onDeleteChannel,
}: ServerChannelListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  const categories = useMemo(
    () => sortByPosition(serverDetails?.categories || []),
    [serverDetails?.categories],
  );

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((current) => ({
      ...current,
      [categoryId]: current[categoryId] === undefined ? false : !current[categoryId],
    }));
  };

  const isExpanded = (categoryId: number) => expandedCategories[categoryId] !== false;

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator color={DiscordColors.blurple} />
        <ThemedText style={styles.loaderText}>Loading server...</ThemedText>
      </View>
    );
  }

  if (!serverDetails) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="server-outline" size={44} color={DiscordColors.textMuted} />
        <ThemedText style={styles.emptyTitle}>Select a server</ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          Tap a server avatar to view categories and channels.
        </ThemedText>
      </View>
    );
  }

  const renderCategoryChannels = (category: CategoryResponse) => {
    const channels = sortByPosition(category.channels || []);
    if (channels.length === 0) return null;

    return (
      <View>
        {channels.map((channel) => (
          <ChannelRow
            key={channel.id}
            channel={channel}
            active={activeChannelId === channel.id}
            isManager={isManager}
            voiceCount={voiceChannelCounts[channel.id] ?? 0}
            onPress={() => onChannelPress(channel)}
            onEdit={() => onEditChannel?.(channel)}
            onDelete={() => onDeleteChannel?.(channel)}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((category) => {
        const expanded = isExpanded(category.id);

        const handleCategoryLongPress = () => {
          if (!isManager) return;

          Alert.alert(`Manage ${category.name}`, 'Choose an action for this category.', [
            { text: 'Add Channel', onPress: () => onAddChannel?.(category.id) },
            { text: 'Edit', onPress: () => onEditCategory?.(category) },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => onDeleteCategory?.(category),
            },
            { text: 'Cancel', style: 'cancel' },
          ]);
        };

          return (
            <View key={category.id} style={styles.categoryBlock}>
            <Pressable
              onPress={() => toggleCategory(category.id)}
              onLongPress={handleCategoryLongPress}
              delayLongPress={260}
              style={styles.categoryHeader}
            >
              <Ionicons
                name={expanded ? 'chevron-down' : 'chevron-forward'}
                size={12}
                color={DiscordColors.textMuted}
              />
              <ThemedText style={styles.categoryTitle} numberOfLines={1}>
                {category.name}
              </ThemedText>
              {isManager ? (
                <Pressable
                  onPress={() => onAddChannel?.(category.id)}
                  style={styles.categoryAddButton}
                >
                  <Ionicons name="add" size={12} color={DiscordColors.textMuted} />
                </Pressable>
              ) : null}
            </Pressable>

            {expanded ? renderCategoryChannels(category) : null}
            </View>
          );
        })}

        {!categories.length ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyTitle}>No channels yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              This server does not have any categories or channels yet.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      {isManager ? (
        <View style={styles.bottomActionContainer}>
          <Pressable style={styles.compactAddCategoryButton} onPress={() => onAddCategory?.()}>
            <Ionicons name="add" size={16} color={DiscordColors.textSecondary} />
            <ThemedText style={styles.compactAddCategoryText}>Category</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  scroll: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 0,
    backgroundColor: DiscordColors.primaryBackground,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loaderText: {
    color: DiscordColors.textMuted,
    fontSize: 13,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: DiscordColors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: DiscordColors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  categoryBlock: {
    marginTop: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  categoryTitle: {
    flex: 1,
    color: DiscordColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  categoryAddButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    marginLeft: 8,
    marginBottom: 2,
  },
  channelRowActive: {
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  channelRowPressed: {
    opacity: 0.88,
  },
  channelIcon: {
    marginRight: 8,
  },
  channelHash: {
    width: 16,
    marginRight: 8,
    color: DiscordColors.textMuted,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  channelName: {
    flex: 1,
    color: DiscordColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  channelNameActive: {
    color: DiscordColors.textPrimary,
  },
  voiceMeta: {
    color: DiscordColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  compactAddCategoryButton: {
    borderRadius: 999,
    backgroundColor: DiscordColors.tertiaryBackground,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    minHeight: 36,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bottomActionContainer: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    alignItems: 'flex-end',
    backgroundColor: DiscordColors.primaryBackground,
  },
  compactAddCategoryText: {
    color: DiscordColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});