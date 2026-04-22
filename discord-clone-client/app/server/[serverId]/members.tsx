import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { UserAvatarWithActions } from '@/components/UserAvatarWithActions';
import { UserRowNameplate } from '@/components/UserRowNameplate';
import { ThemedText } from '@/components/themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import {
  MemberSearchResult,
  ServerMemberResponse,
  ServerMemberRole,
  getServerMembers,
  kickMember,
  banMember,
  timeoutMember,
  removeTimeout,
  searchMembersInServer,
} from '@/services/serverService';
import { useAuthStore } from '@/store/useAuthStore';
import { useServerStore } from '@/store/useServerStore';

const ROLE_ORDER: ServerMemberRole[] = ['OWNER', 'ADMIN', 'MEMBER'];

const toTitle = (role: ServerMemberRole) => {
  if (role === 'OWNER') return 'Owner';
  if (role === 'ADMIN') return 'Admin';
  return 'Member';
};

const normalizeError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    if (e.response?.data?.message) return String(e.response.data.message);
    if (e.message) return String(e.message);
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
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timeout dialog
  const [timeoutVisible, setTimeoutVisible] = useState(false);
  const [timeoutTarget, setTimeoutTarget] = useState<ServerMemberResponse | null>(null);
  const [timeoutMinutes, setTimeoutMinutes] = useState('10');

  const myRole = useMemo<ServerMemberRole | null>(() => {
    if (!user?.id) return null;
    return members.find((m) => m.userId === Number(user.id))?.role ?? null;
  }, [members, user?.id]);

  const isOwner = myRole === 'OWNER';

  const loadMembers = useCallback(async () => {
    if (!Number.isFinite(parsedServerId) || parsedServerId <= 0) {
      setError('Invalid server id.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setMembers(await getServerMembers(parsedServerId));
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setIsLoading(false);
    }
  }, [parsedServerId]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      try { setSearchResults(await searchMembersInServer(parsedServerId, query.trim())); }
      catch { setSearchResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [parsedServerId, query]);

  const visibleMembers = useMemo<ServerMemberResponse[]>(() => {
    if (!searchResults) return members;
    const ids = new Set(searchResults.map((m) => m.userId));
    return members.filter((m) => ids.has(m.userId));
  }, [members, searchResults]);

  const groupedMembers = useMemo(() => {
    const g: Record<ServerMemberRole, ServerMemberResponse[]> = { OWNER: [], ADMIN: [], MEMBER: [] };
    visibleMembers.forEach((m) => g[m.role].push(m));
    return g;
  }, [visibleMembers]);

  const canActOn = (target: ServerMemberResponse) => {
    if (!canManage) return false;
    if (Number(user?.id) === target.userId) return false;
    if (target.role === 'OWNER') return false;
    if (myRole === 'ADMIN' && target.role === 'ADMIN') return false;
    return true;
  };

  const isTimedOut = (m: ServerMemberResponse) =>
    !!m.timeoutUntil && new Date(m.timeoutUntil) > new Date();

  // ─── Actions ──────────────────────────────────────────────────────────────

  const doKick = (member: ServerMemberResponse) =>
    Alert.alert('Kick Member', `Kick "${member.displayName || member.userName}" from this server?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Kick', style: 'destructive', onPress: async () => {
        setIsActionLoading(true);
        try {
          await kickMember(parsedServerId, member.userId);
          Alert.alert('Done', `${member.displayName || member.userName} has been kicked.`);
          void loadMembers();
        } catch (e: any) {
          Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed.');
        } finally { setIsActionLoading(false); }
      }},
    ]);

  const doBan = (member: ServerMemberResponse) =>
    Alert.alert('Ban Member', `Ban "${member.displayName || member.userName}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Ban', style: 'destructive', onPress: async () => {
        setIsActionLoading(true);
        try {
          await banMember(parsedServerId, member.userId);
          Alert.alert('Done', `${member.displayName || member.userName} has been banned.`);
          void loadMembers();
        } catch (e: any) {
          Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed.');
        } finally { setIsActionLoading(false); }
      }},
    ]);

  const doRemoveTimeout = (member: ServerMemberResponse) =>
    Alert.alert('Remove Timeout', `Remove timeout from "${member.displayName || member.userName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: async () => {
        setIsActionLoading(true);
        try {
          await removeTimeout(parsedServerId, member.userId);
          Alert.alert('Done', 'Timeout removed.');
          void loadMembers();
        } catch (e: any) {
          Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed.');
        } finally { setIsActionLoading(false); }
      }},
    ]);

  const openTimeoutDialog = (member: ServerMemberResponse) => {
    setTimeoutTarget(member);
    setTimeoutMinutes('10');
    setTimeoutVisible(true);
  };

  const confirmTimeout = async () => {
    if (!timeoutTarget) return;
    const mins = parseInt(timeoutMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Invalid', 'Enter a number greater than 0.');
      return;
    }
    setTimeoutVisible(false);
    setIsActionLoading(true);
    try {
      await timeoutMember(parsedServerId, timeoutTarget.userId, mins);
      Alert.alert('Done', `${timeoutTarget.displayName || timeoutTarget.userName} timed out for ${mins} min.`);
      void loadMembers();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed.');
    } finally {
      setIsActionLoading(false);
      setTimeoutTarget(null);
    }
  };

  const doTransferOwnership = (member: ServerMemberResponse) =>
    Alert.alert(
      'Transfer Ownership',
      `Transfer ownership to "${member.displayName || member.userName}"? You will become an Admin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Transfer', style: 'destructive', onPress: async () => {
          setIsActionLoading(true);
          try {
            await useServerStore.getState().transferOwnership(parsedServerId, member.userId);
            Alert.alert('Success', 'Ownership transferred successfully.');
            void loadMembers();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed.');
          } finally { setIsActionLoading(false); }
        }},
      ]
    );

  // ─── Long press handler ────────────────────────────────────────────────────

  const onLongPress = (member: ServerMemberResponse) => {
    const isSelf = Number(user?.id) === member.userId;
    // Chỉ OWNER mới có quyền quản lý thành viên
    if (isSelf || !isOwner || member.role === 'OWNER') return;

    const timedOut = isTimedOut(member);
    const btns: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress: () => void }> = [
      { text: '👢 Kick', style: 'destructive', onPress: () => doKick(member) },
      { text: '🔨 Ban', style: 'destructive', onPress: () => doBan(member) },
      timedOut
        ? { text: '✅ Remove Timeout', onPress: () => doRemoveTimeout(member) }
        : { text: '⏱ Timeout', onPress: () => openTimeoutDialog(member) },
      { text: '👑 Transfer Ownership', style: 'destructive', onPress: () => doTransferOwnership(member) },
    ];

    Alert.alert(
      member.displayName || member.userName,
      timedOut ? '⏱ Currently timed out' : 'Member actions',
      [...btns, { text: 'Cancel', style: 'cancel', onPress: () => {} }]
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={DiscordColors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText style={s.title}>Members</ThemedText>
            <ThemedText style={s.subtitle}>{visibleMembers.length} members</ThemedText>
          </View>
          {isActionLoading && <ActivityIndicator color={DiscordColors.blurple} size="small" />}
        </View>

        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color={DiscordColors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search members"
            placeholderTextColor={DiscordColors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={DiscordColors.textMuted} />
            </Pressable>
          )}
        </View>

        {error ? (
          <Pressable style={s.errorCard} onPress={() => void loadMembers()}>
            <Ionicons name="alert-circle" size={16} color={DiscordColors.red} />
            <ThemedText style={s.errorText}>{error}</ThemedText>
            <ThemedText style={s.retryText}>Retry</ThemedText>
          </Pressable>
        ) : null}

        {isLoading ? (
          <View style={s.loaderWrap}><ActivityIndicator color={DiscordColors.blurple} /></View>
        ) : (
          <ScrollView style={s.list} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
            {ROLE_ORDER.map((role) => {
              const list = groupedMembers[role];
              if (!list.length) return null;
              return (
                <View key={role} style={s.group}>
                  <ThemedText style={s.groupTitle}>{toTitle(role)} — {list.length}</ThemedText>
                  {list.map((member) => (
                    <Pressable
                      key={member.id}
                      onLongPress={() => onLongPress(member)}
                      delayLongPress={260}
                      style={s.memberRow}
                    >
                      <UserRowNameplate cardEffectId={member.cardEffectId} style={s.memberRowInner}>
                        <UserAvatarWithActions
                          user={{
                            id: member.userId,
                            username: member.userName,
                            displayName: member.displayName,
                            avatar: member.avatarUrl || undefined,
                            status: member.status || undefined,
                            avatarEffectId: member.avatarEffectId || undefined,
                            bannerEffectId: member.bannerEffectId || undefined,
                            cardEffectId: member.cardEffectId || undefined,
                          }}
                          size={38}
                        />
                        <View style={{ flex: 1 }}>
                          <ThemedText style={s.memberName} numberOfLines={1}>
                            {member.nickname || member.displayName || member.userName}
                            {isTimedOut(member) ? '  ⏱' : ''}
                          </ThemedText>
                          <ThemedText style={s.memberSub} numberOfLines={1}>@{member.userName}</ThemedText>
                        </View>
                        <View style={[
                          s.badge,
                          role === 'OWNER' && s.badgeOwner,
                          role === 'ADMIN' && s.badgeAdmin,
                        ]}>
                          <ThemedText style={[s.badgeText, (role === 'OWNER' || role === 'ADMIN') && s.badgeTextLight]}>
                            {toTitle(role)}
                          </ThemedText>
                        </View>
                      </UserRowNameplate>
                    </Pressable>
                  ))}
                </View>
              );
            })}
            {!visibleMembers.length && (
              <View style={s.emptyWrap}>
                <Ionicons name="people-outline" size={42} color={DiscordColors.textMuted} />
                <ThemedText style={s.emptyTitle}>No members found</ThemedText>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* ── Timeout Dialog ─────────────────────────────────────────────────── */}
      <Modal visible={timeoutVisible} transparent animationType="fade" onRequestClose={() => setTimeoutVisible(false)}>
        <View style={s.overlay}>
          {/* Tap-outside-to-close layer */}
          <TouchableWithoutFeedback onPress={() => setTimeoutVisible(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          {/* Card — does NOT propagate touch to overlay */}
          <View style={s.card}>
            {/* Header row with X button */}
            <View style={s.cardHeader}>
              <View style={{ flex: 1 }} />
              <ThemedText style={s.cardTitle}>Timeout Member</ThemedText>
              <Pressable style={s.closeBtn} onPress={() => setTimeoutVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={18} color={DiscordColors.textMuted} />
              </Pressable>
            </View>

            <ThemedText style={s.cardSub}>
              {timeoutTarget?.displayName || timeoutTarget?.userName}
            </ThemedText>

            <ThemedText style={s.inputLabel}>Duration (minutes)</ThemedText>
            <TextInput
              style={s.input}
              value={timeoutMinutes}
              onChangeText={setTimeoutMinutes}
              keyboardType="number-pad"
              placeholder="e.g. 10"
              placeholderTextColor={DiscordColors.textMuted}
              maxLength={5}
              autoFocus
            />

            <View style={s.presets}>
              {[5, 10, 30, 60].map((m) => (
                <Pressable key={m} style={({ pressed }) => [s.presetBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setTimeoutMinutes(String(m))}>
                  <ThemedText style={s.presetText}>{m}m</ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={s.cardActions}>
              <Pressable style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setTimeoutVisible(false)}>
                <ThemedText style={s.cancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable style={({ pressed }) => [s.confirmBtn, pressed && { opacity: 0.85 }]}
                onPress={confirmTimeout}>
                <ThemedText style={s.confirmText}>Timeout</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DiscordColors.primaryBackground },
  container: { flex: 1, padding: Spacing.lg, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: DiscordColors.secondaryBackground },
  title: { color: DiscordColors.textPrimary, fontSize: 20, fontWeight: '800' },
  subtitle: { color: DiscordColors.textMuted, fontSize: 12, marginTop: 2 },
  searchBar: { height: 44, borderRadius: 12, backgroundColor: DiscordColors.secondaryBackground, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  searchInput: { flex: 1, color: DiscordColors.textPrimary, fontSize: 14 },
  errorCard: { backgroundColor: 'rgba(242,63,67,0.14)', borderWidth: 1, borderColor: 'rgba(242,63,67,0.4)', borderRadius: 10, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  errorText: { flex: 1, color: DiscordColors.textPrimary, fontSize: 13 },
  retryText: { color: DiscordColors.textMuted, fontSize: 12, fontWeight: '600' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  group: { marginBottom: Spacing.lg, gap: 6 },
  groupTitle: { color: DiscordColors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  memberRow: { borderRadius: 12, backgroundColor: DiscordColors.secondaryBackground, overflow: 'hidden', marginBottom: 2 },
  memberRowInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, flex: 1 },
  memberName: { color: DiscordColors.textPrimary, fontSize: 14, fontWeight: '700' },
  memberSub: { color: DiscordColors.textMuted, fontSize: 12, marginTop: 1 },
  badge: { borderRadius: 8, backgroundColor: DiscordColors.tertiaryBackground, paddingHorizontal: 8, paddingVertical: 4 },
  badgeOwner: { backgroundColor: 'rgba(250,166,26,0.2)' },
  badgeAdmin: { backgroundColor: 'rgba(88,101,242,0.2)' },
  badgeText: { color: DiscordColors.textSecondary, fontSize: 11, fontWeight: '700' },
  badgeTextLight: { color: DiscordColors.textPrimary },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: Spacing.sm },
  emptyTitle: { color: DiscordColors.textSecondary, fontSize: 15, fontWeight: '700' },
  // ── Timeout Dialog ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  card: { backgroundColor: DiscordColors.secondaryBackground, borderRadius: 18, padding: Spacing.xl, width: '100%', gap: Spacing.md, borderWidth: 1, borderColor: DiscordColors.divider },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, color: DiscordColors.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: DiscordColors.tertiaryBackground, alignItems: 'center', justifyContent: 'center' },
  cardSub: { color: DiscordColors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: -Spacing.sm },
  inputLabel: { color: DiscordColors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: DiscordColors.tertiaryBackground, borderRadius: 10, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: DiscordColors.textPrimary, fontSize: 24, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: DiscordColors.divider },
  presets: { flexDirection: 'row', gap: Spacing.sm },
  presetBtn: { flex: 1, backgroundColor: DiscordColors.tertiaryBackground, borderRadius: 8, paddingVertical: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: DiscordColors.divider },
  presetText: { color: DiscordColors.textSecondary, fontSize: 13, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  cancelBtn: { flex: 1, backgroundColor: DiscordColors.tertiaryBackground, borderRadius: 10, paddingVertical: Spacing.md, alignItems: 'center' },
  cancelText: { color: DiscordColors.textSecondary, fontSize: 15, fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: DiscordColors.blurple, borderRadius: 10, paddingVertical: Spacing.md, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
