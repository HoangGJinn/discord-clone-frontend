import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { DiscordColors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ServerResponse } from '@/services/serverService';

interface ServerSidebarProps {
  servers: ServerResponse[];
  activeServerId: number | null;
  isLoading?: boolean;
  onServerPress: (server: ServerResponse) => void;
  onServerLongPress?: (server: ServerResponse) => void;
  onCreateServerPress: () => void;
}

const SIDEBAR_COLORS = [
  '#5865F2',
  '#3BA55C',
  '#FAA61A',
  '#ED4245',
  '#57F287',
  '#EB459E',
  '#00A8FC',
];

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const colorFromId = (id: number) => SIDEBAR_COLORS[id % SIDEBAR_COLORS.length];

export function ServerSidebar({
  servers,
  activeServerId,
  isLoading = false,
  onServerPress,
  onServerLongPress,
  onCreateServerPress,
}: ServerSidebarProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.homeButton}>
        <Ionicons name="logo-discord" size={24} color="#fff" />
      </Pressable>

      <View style={styles.divider} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={DiscordColors.blurple} />
        ) : null}

        {!isLoading && servers.length === 0 ? (
          <ThemedText style={styles.emptyLabel}>No servers</ThemedText>
        ) : null}

        {servers.map((server) => {
          const isActive = activeServerId === server.id;
          const unreadCount = server.unreadCount ?? 0;

          return (
            <Pressable
              key={server.id}
              onPress={() => onServerPress(server)}
              onLongPress={() => onServerLongPress?.(server)}
              delayLongPress={260}
              style={({ pressed }) => [
                styles.serverItem,
                isActive ? styles.serverItemActive : styles.serverItemInactive,
                pressed && styles.serverItemPressed,
                !server.iconUrl && { backgroundColor: colorFromId(server.id) },
              ]}
            >
              {server.iconUrl ? (
                <Image source={{ uri: server.iconUrl }} style={styles.serverIcon} />
              ) : (
                <ThemedText style={styles.serverInitials}>
                  {getInitials(server.name)}
                </ThemedText>
              )}

              {isActive ? <View style={styles.activeIndicator} /> : null}

              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : String(unreadCount)}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        <Pressable style={styles.addButton} onPress={onCreateServerPress}>
          <Ionicons name="add" size={22} color={DiscordColors.green} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 76,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: 0,
  },
  homeButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: DiscordColors.blurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 32,
    height: 2,
    borderRadius: 999,
    backgroundColor: DiscordColors.divider,
    marginVertical: Spacing.md,
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: 0,
  },
  emptyLabel: {
    fontSize: 11,
    color: DiscordColors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  serverItem: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  serverItemActive: {
    borderRadius: 16,
  },
  serverItemInactive: {
    borderRadius: 24,
  },
  serverItemPressed: {
    opacity: 0.85,
  },
  serverIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  serverInitials: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  activeIndicator: {
    position: 'absolute',
    left: -14,
    width: 4,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    paddingHorizontal: 4,
    backgroundColor: DiscordColors.red,
    borderWidth: 2,
    borderColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 10,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DiscordColors.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
});

