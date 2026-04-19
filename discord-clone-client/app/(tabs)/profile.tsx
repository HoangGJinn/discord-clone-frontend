import apiClient from '@/api/client';
import { Avatar } from '@/components/Avatar';
import { BACKGROUND_EFFECTS, NAMEPLATE_EFFECTS } from '@/constants/profileEffects';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserStatus = 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';

interface StatusOption {
  value: UserStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'ONLINE', label: 'Trực tuyến', icon: 'ellipse', color: '#23A559' },
  { value: 'IDLE', label: 'Chờ', icon: 'moon', color: '#F2A31A' },
  { value: 'DND', label: 'Vui Lòng Không Làm Phiền', icon: 'remove-circle', color: '#F23F43' },
  { value: 'OFFLINE', label: 'Vô hình', icon: 'radio-button-off', color: '#80848E' },
];

const normalizeStatus = (status?: string): UserStatus => {
  const value = String(status || 'OFFLINE').toUpperCase();
  if (value === 'ONLINE') return 'ONLINE';
  if (value === 'IDLE') return 'IDLE';
  if (value === 'DND') return 'DND';
  return 'OFFLINE';
};

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isAccountVisible, setIsAccountVisible] = useState(false);
  const [isStatusVisible, setIsStatusVisible] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }, [logout]);

  const handleStatusChange = useCallback(
    async (status: UserStatus) => {
      try {
        await apiClient.put('/users/me/status', { status });
        updateUser({ status });
        setIsStatusVisible(false);
      } catch (err: any) {
        Alert.alert('Lỗi', err?.message || 'Không thể cập nhật trạng thái.');
      }
    },
    [updateUser],
  );

  const avatarColor = useMemo(() => {
    if (!user?.username) {
      return DiscordColors.blurple;
    }

    const colors = ['#5865F2', '#3A3FF0', '#5C57F2', '#7B4EF1', '#4B5AE2'];
    let hash = 0;
    for (let index = 0; index < user.username.length; index += 1) {
      hash = user.username.charCodeAt(index) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [user?.username]);

  if (!user) {
    return (
      <View style={[styles.container, styles.center]}>
        <ThemedText style={styles.emptyText}>Vui lòng đăng nhập để xem hồ sơ.</ThemedText>
      </View>
    );
  }

  const currentStatus = normalizeStatus(user.status);
  const statusOption = STATUS_OPTIONS.find((option) => option.value === currentStatus) || STATUS_OPTIONS[0];
  const activeBgEffect = user.bannerEffectId ? BACKGROUND_EFFECTS.find(e => e.id === user.bannerEffectId) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DiscordColors.textSecondary}
          />
        )}
      >
        <View style={styles.banner}>
          <View style={[styles.bannerOverlay, { backgroundColor: avatarColor }]} />
          {activeBgEffect && (
            <Image
              source={activeBgEffect.uri}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              contentFit="cover"
            />
          )}

          <View style={styles.bannerActions}>
            <TouchableOpacity style={styles.bannerIconBtn}>
              <Ionicons name="inbox" size={18} color={DiscordColors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.nitroBadge}>
              <Ionicons name="pricetag" size={14} color={DiscordColors.textPrimary} />
              <ThemedText style={styles.nitroText}>Nitro Basic</ThemedText>
            </View>

            <TouchableOpacity style={styles.bannerIconBtn} onPress={() => setIsSettingsVisible(true)}>
              <Ionicons name="settings" size={18} color={DiscordColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => setIsStatusVisible(true)}
            activeOpacity={0.8}
          >
            <Avatar
              name={user.displayName || user.username}
              uri={user.avatar}
              size={84}
              status={currentStatus}
              avatarEffectId={user.avatarEffectId}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.hobbyBtn}>
            <Ionicons name="add" size={20} color={DiscordColors.textPrimary} />
            <ThemedText style={styles.hobbyText}>Sở thích mới</ThemedText>
          </TouchableOpacity>

          <View style={styles.nameSection}>
            <ThemedText style={styles.displayName}>{user.displayName || user.username}</ThemedText>
            <ThemedText style={styles.username}>@{user.username}</ThemedText>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => router.push('/profile/edit')}
          >
            <Ionicons name="pencil" size={18} color="#fff" />
            <ThemedText style={styles.editProfileText}>Sửa Hồ Sơ</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <ThemedText style={styles.cardTitle}>Trạng thái hiện tại</ThemedText>
            <View style={styles.statusPill}>
              <Ionicons name={statusOption.icon} size={12} color={statusOption.color} />
              <ThemedText style={styles.statusPillText}>{statusOption.label}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.cardSubtitle}>{user.bio || 'Chưa có giới thiệu cá nhân.'}</ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Gia Nhập Từ</ThemedText>
          <View style={styles.inlineRow}>
            <Ionicons name="logo-discord" size={20} color={DiscordColors.textSecondary} />
            <ThemedText style={styles.joinedText}>5 thg 10, 2023</ThemedText>
          </View>
        </View>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/friends')}>
          <View style={styles.rowBetween}>
            <ThemedText style={styles.cardTitle}>Bạn bè</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={DiscordColors.textMuted} />
          </View>
          <ThemedText style={styles.cardSubtitle}>Xem danh sách bạn bè và cuộc trò chuyện gần đây.</ThemedText>
        </TouchableOpacity>

        <View style={styles.noteCard}>
          <ThemedText style={styles.notePlaceholder}>Ghi chú (chỉ hiển thị cho bạn)</ThemedText>
          <Ionicons name="calendar-outline" size={24} color={DiscordColors.textSecondary} />
        </View>
      </ScrollView>

      <Modal
        visible={isSettingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSettingsVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <ThemedText style={styles.sheetTitle}>Cài đặt</ThemedText>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                setIsSettingsVisible(false);
                setIsAccountVisible(true);
              }}
            >
              <Ionicons name="person-circle-outline" size={20} color={DiscordColors.textPrimary} />
              <ThemedText style={styles.settingText}>Tài khoản</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={DiscordColors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Thông báo', 'Sẽ cập nhật sớm.')}>
              <Ionicons name="notifications-outline" size={20} color={DiscordColors.textPrimary} />
              <ThemedText style={styles.settingText}>Thông báo</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={DiscordColors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Giao diện', 'Sẽ cập nhật sớm.')}>
              <Ionicons name="color-palette-outline" size={20} color={DiscordColors.textPrimary} />
              <ThemedText style={styles.settingText}>Giao diện</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={DiscordColors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, styles.logoutRow]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={DiscordColors.red} />
              <ThemedText style={styles.logoutText}>Đăng xuất</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isAccountVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAccountVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsAccountVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <ThemedText style={styles.sheetTitle}>Tài khoản</ThemedText>

            <View style={styles.accountInfoBox}>
              <ThemedText style={styles.accountLabel}>Email hiện tại</ThemedText>
              <ThemedText style={styles.accountValue}>{user.email || 'Chưa có email'}</ThemedText>
            </View>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => Alert.alert('Chỉnh sửa email', 'Tính năng cập nhật email sẽ sớm được thêm.')}
            >
              <Ionicons name="mail-outline" size={20} color={DiscordColors.textPrimary} />
              <ThemedText style={styles.settingText}>Xem/Sửa email</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={DiscordColors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                setIsAccountVisible(false);
                router.push('/change-password');
              }}
            >
              <Ionicons name="key-outline" size={20} color={DiscordColors.textPrimary} />
              <ThemedText style={styles.settingText}>Đổi mật khẩu</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={DiscordColors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isStatusVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStatusVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsStatusVisible(false)} />
          <View style={styles.statusSheet}>
            <View style={styles.sheetHandle} />
            <ThemedText style={styles.sheetTitle}>Thay đổi trạng thái trực tuyến</ThemedText>
            <ThemedText style={styles.statusSectionLabel}>Trạng thái trực tuyến</ThemedText>

            <View style={styles.statusList}>
              {STATUS_OPTIONS.map((option) => {
                const selected = option.value === currentStatus;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.statusRow}
                    onPress={() => {
                      void handleStatusChange(option.value);
                    }}
                  >
                    <Ionicons name={option.icon} size={20} color={option.color} />
                    <ThemedText style={styles.statusLabel}>{option.label}</ThemedText>
                    <View style={[styles.statusRadio, selected && styles.statusRadioActive]}>
                      {selected ? <View style={styles.statusRadioInner} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.customStatusBtn}
              onPress={() => Alert.alert('Trạng thái tùy chỉnh', 'Tính năng này sẽ sớm được thêm.')}
            >
              <Ionicons name="happy-outline" size={22} color={DiscordColors.yellow} />
              <ThemedText style={styles.customStatusText}>Đặt trạng thái tùy chỉnh</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: DiscordColors.textMuted,
  },
  scrollContent: {
    paddingBottom: 22,
  },
  banner: {
    height: 170,
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.88,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  bannerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nitroBadge: {
    backgroundColor: 'rgba(0,0,0,0.68)',
    borderRadius: 21,
    minHeight: 42,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nitroText: {
    color: DiscordColors.textPrimary,
    fontSize: 18 / 2,
    fontWeight: '800',
  },
  profileHeader: {
    marginTop: -34,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    paddingVertical: Spacing.md,
  },
  nameSection: {
    marginTop: Spacing.md,
  },
  avatarWrap: {
    alignSelf: 'flex-start',
  },
  hobbyBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444852',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  hobbyText: {
    color: DiscordColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  displayName: {
    marginTop: Spacing.md,
    color: DiscordColors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },
  username: {
    marginTop: 2,
    color: DiscordColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  editProfileBtn: {
    marginTop: Spacing.md,
    backgroundColor: DiscordColors.blurple,
    borderRadius: 16,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editProfileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  card: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: 14,
    backgroundColor: '#2B2F37',
    padding: Spacing.md,
    gap: 6,
  },
  noteCard: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: 14,
    backgroundColor: '#2B2F37',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notePlaceholder: {
    color: DiscordColors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  cardTitle: {
    color: DiscordColors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: DiscordColors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  joinedText: {
    color: DiscordColors.textSecondary,
    fontSize: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusPillText: {
    color: DiscordColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  modalSheet: {
    backgroundColor: '#1F212B',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 20,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  statusSheet: {
    backgroundColor: '#1F212B',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 20,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: DiscordColors.textMuted,
    opacity: 0.5,
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    color: DiscordColors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  settingRow: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#2B2F37',
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  settingText: {
    color: DiscordColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  logoutRow: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(242,63,67,0.5)',
    backgroundColor: 'rgba(242,63,67,0.12)',
  },
  logoutText: {
    color: DiscordColors.red,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  accountInfoBox: {
    borderRadius: 12,
    backgroundColor: '#2B2F37',
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  accountLabel: {
    color: DiscordColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  accountValue: {
    color: DiscordColors.textPrimary,
    fontSize: 15,
    marginTop: 4,
    fontWeight: '700',
  },
  statusSectionLabel: {
    color: DiscordColors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  statusList: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#2B2F37',
  },
  statusRow: {
    minHeight: 62,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DiscordColors.divider,
    gap: Spacing.md,
  },
  statusLabel: {
    color: DiscordColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  statusRadio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: DiscordColors.blurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRadioActive: {
    borderColor: '#6375FF',
  },
  statusRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6375FF',
  },
  customStatusBtn: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#2B2F37',
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 4,
  },
  customStatusText: {
    color: DiscordColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
