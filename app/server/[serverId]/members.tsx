import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { ThemedText } from '@/components/themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import {
  MemberSearchResult,
  ServerMemberResponse,
  ServerMemberRole,
  getServerMembers,
  searchMembersInServer,
} from '@/services/serverService';
import { useAuthStore } from '@/store/useAuthStore';

const ROLE_ORDER: ServerMemberRole[] = ['OWNER', 'ADMIN', 'MEMBER'];

const toTitle = (role: ServerMemberRole) => {
  if (role === 'OWNER') return 'Owner';
  if (role === 'ADMIN') return 'Admin';
  return 'Member';
};

const normalizeError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    if (maybeError.response?.data?.message) return String(maybeError.response.data.message);
    if (maybeError.message) return String(maybeError.message);
  }
  return 'Could not load members.';
};

export default function ServerMembersScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const parsedServerId = Number(serverId);

  const [members, setMembers] = useState<ServerMemberResponse[]>([]);
  const [searchResults, setSearchResults] = useState<MemberSearchResult[] | null>(null);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const myRole = useMemo<ServerMemberRole | null>(() => {
    if (!user?.id) return null;
    const userId = Number(user.id);
    return members.find((member) => member.userId === userId)?.role ?? null;
  }, [members, user?.id]);

  const canKickOrBan = myRole === 'OWNER' || myRole === 'ADMIN';
  const canChangeRole = myRole === 'OWNER';

  const loadMembers = useCallback(async () => {
    if (!Number.isFinite(parsedServerId) || parsedServerId <= 0) {
      setError('Invalid server id.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getServerMembers(parsedServerId);
      setMembers(response);
    } catch (loadError) {
      setError(normalizeError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [parsedServerId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await searchMembersInServer(parsedServerId, query.trim());
        setSearchResults(response);
      } catch {
        setSearchResults([]);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [parsedServerId, query]);

  const visibleMembers = useMemo<ServerMemberResponse[]>(() => {
    if (!searchResults) return members;

    const byUserId = new Map(searchResults.map((member) => [member.userId, true]));
    return members.filter((member) => byUserId.has(member.userId));
  }, [members, searchResults]);

  const groupedMembers = useMemo(() => {
    const groups: Record<ServerMemberRole, ServerMemberResponse[]> = {
      OWNER: [],
      ADMIN: [],
      MEMBER: [],
    };

    for (const member of visibleMembers) {
      groups[member.role].push(member);
    }

    return groups;
  }, [visibleMembers]);

  const handleMemberActions = (member: ServerMemberResponse) => {
    const isSelf = Number(user?.id) === member.userId;
    const isTargetOwner = member.role === 'OWNER';

    const actions = [
      {
        text: 'Kick',
        disabled: !canKickOrBan || isSelf || isTargetOwner,
        onPress: () => Alert.alert('Not available', 'Kick API is not implemented by backend yet.'),
      },
      {
        text: 'Ban',
        disabled: !canKickOrBan || isSelf || isTargetOwner,
        onPress: () => Alert.alert('Not available', 'Ban API is not implemented by backend yet.'),
      },
      {
        text: 'Change role',
        disabled: !canChangeRole || isSelf || isTargetOwner,
        onPress: () => Alert.alert('Not available', 'Role update API is not implemented by backend yet.'),
      },
    ];

    const buttons = actions
      .filter((action) => !action.disabled)
      .map((action) => ({ text: action.text, onPress: action.onPress }));

    if (buttons.length === 0) {
      return;
    }

    Alert.alert(member.displayName || member.userName, 'Member actions', [
      ...buttons,
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={DiscordColors.textPrimary} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <ThemedText style={styles.title}>Members</ThemedText>
            <ThemedText style={styles.subtitle}>{visibleMembers.length} members</ThemedText>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={DiscordColors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members in server"
            placeholderTextColor={DiscordColors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {error ? (
          <Pressable style={styles.errorCard} onPress={() => void loadMembers()}>
            <Ionicons name="alert-circle" size={16} color={DiscordColors.red} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        ) : null}

        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={DiscordColors.blurple} />
          </View>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {ROLE_ORDER.map((role) => {
              const roleMembers = groupedMembers[role];
              if (!roleMembers.length) return null;

              return (
                <View key={role} style={styles.groupSection}>
                  <ThemedText style={styles.groupTitle}>
                    {toTitle(role)} - {roleMembers.length}
                  </ThemedText>

                  {roleMembers.map((member) => (
                    <Pressable
                      key={member.id}
                      onLongPress={() => handleMemberActions(member)}
                      delayLongPress={260}
                      style={styles.memberRow}
                    >
                      <Avatar
                        size={38}
                        name={member.displayName || member.userName}
                        uri={member.avatarUrl || undefined}
                        status={member.status ?? 'OFFLINE'}
                      />

                      <View style={styles.memberInfo}>
                        <ThemedText style={styles.memberName} numberOfLines={1}>
                          {member.nickname || member.displayName || member.userName}
                        </ThemedText>
                        <ThemedText style={styles.memberSub} numberOfLines={1}>
                          @{member.userName}
                        </ThemedText>
                      </View>

                      <View style={styles.roleBadge}>
                        <ThemedText style={styles.roleBadgeText}>{toTitle(member.role)}</ThemedText>
                      </View>
                    </Pressable>
                  ))}
                </View>
              );
            })}

            {!visibleMembers.length ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="people-outline" size={42} color={DiscordColors.textMuted} />
                <ThemedText style={styles.emptyTitle}>No members found</ThemedText>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
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
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DiscordColors.secondaryBackground,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: DiscordColors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: DiscordColors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  searchBar: {
    height: 44,
    borderRadius: 12,
    backgroundColor: DiscordColors.secondaryBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: DiscordColors.textPrimary,
    fontSize: 14,
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
  retryText: {
    color: DiscordColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  groupSection: {
    marginBottom: Spacing.lg,
    gap: 8,
  },
  groupTitle: {
    color: DiscordColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: DiscordColors.secondaryBackground,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: DiscordColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  memberSub: {
    color: DiscordColors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  roleBadge: {
    borderRadius: 8,
    backgroundColor: DiscordColors.tertiaryBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleBadgeText: {
    color: DiscordColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: DiscordColors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
});
