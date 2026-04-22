import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { Avatar } from './Avatar';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useDMStore } from '@/store/useDMStore';
import { useFriendStore, UserSearchResult } from '@/store/useFriendStore';
import { AVATAR_EFFECTS, BACKGROUND_EFFECTS, NAMEPLATE_EFFECTS } from '@/constants/profileEffects';

export interface QuickActionUser {
  id: string | number;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  status?: string | null;
  bio?: string | null;
  avatarEffectId?: string | null;
  bannerEffectId?: string | null;
  cardEffectId?: string | null;
}

interface UserAvatarWithActionsProps {
  user: QuickActionUser;
  size?: number;
  avatarStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  status?: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
  disabled?: boolean;
}

const normalizeStatus = (status?: string | null): 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE' => {
  const normalized = String(status || 'OFFLINE').toUpperCase();
  if (normalized === 'ONLINE') return 'ONLINE';
  if (normalized === 'IDLE') return 'IDLE';
  if (normalized === 'DND') return 'DND';
  return 'OFFLINE';
};

export function UserAvatarWithActions({
  user,
  size = 40,
  avatarStyle,
  style,
  status,
  disabled = false,
}: UserAvatarWithActionsProps) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const getOrCreateConversation = useDMStore((state) => state.getOrCreateConversation);

  const [isVisible, setIsVisible] = useState(false);
  const [isLoadingDm, setIsLoadingDm] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [friendInfo, setFriendInfo] = useState<UserSearchResult | null>(null);
  const [isFriendLoading, setIsFriendLoading] = useState(false);

  const {
    getFriendshipStatus,
    sendFriendRequest,
    unfriend,
    cancelFriendRequest,
    acceptFriendRequest,
  } = useFriendStore();

  const fetchFriendship = async () => {
    if (isSelf) return;
    setIsFriendLoading(true);
    try {
      const info = await getFriendshipStatus(Number(user.id));
      setFriendInfo(info);
    } catch (err) {
      console.error('Failed to fetch friendship status:', err);
    } finally {
      setIsFriendLoading(false);
    }
  };

  React.useEffect(() => {
    if (isVisible && !isSelf) {
      fetchFriendship();
    }
  }, [isVisible, isSelf]);

  const effectiveStatus = useMemo(() => {
    if (status) return status;
    return normalizeStatus(user.status);
  }, [status, user.status]);

  const displayName = user.displayName || user.username;
  const isSelf = String(currentUser?.id || '') === String(user.id);
  const activeBgEffect = user.bannerEffectId ? BACKGROUND_EFFECTS.find(e => e.id === user.bannerEffectId) : null;
  const activeNameplateEffect = user.cardEffectId ? NAMEPLATE_EFFECTS.find(e => e.id === user.cardEffectId) : null;

  const closeSheet = () => {
    setIsVisible(false);
    setShowProfileDetails(false);
  };

  const handleOpenMessage = async () => {
    if (isSelf || isLoadingDm) {
      return;
    }

    setIsLoadingDm(true);
    try {
      const conversationId = await getOrCreateConversation(String(user.id));
      if (conversationId) {
        closeSheet();
        router.push(`/dm/${conversationId}` as any);
      }
    } finally {
      setIsLoadingDm(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={style}
        onPress={() => setIsVisible(true)}
        disabled={disabled}
        activeOpacity={0.75}
      >
        <Avatar
          name={displayName}
          uri={user.avatar || undefined}
          size={size}
          status={effectiveStatus}
          avatarEffectId={user.avatarEffectId}
          style={avatarStyle as ViewStyle}
        />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={closeSheet} />

          <View style={styles.sheet}>
            {activeBgEffect && (
              <Image
                source={activeBgEffect.uri}
                style={[StyleSheet.absoluteFill, { zIndex: -1, borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}
                pointerEvents="none"
                contentFit="cover"
              />
            )}
            {activeNameplateEffect && (
              <Image
                source={activeNameplateEffect.uri}
                style={[styles.nameplateImage, { zIndex: 1 }]}
                pointerEvents="none"
                contentFit="cover"
              />
            )}
            <View style={styles.handle} />

            <View style={styles.userHeader}>
              <Avatar
                name={displayName}
                uri={user.avatar || undefined}
                size={68}
                status={effectiveStatus}
                avatarEffectId={user.avatarEffectId}
              />
              <View style={styles.userInfo}>
                <ThemedText style={styles.displayName}>{displayName}</ThemedText>
                <ThemedText style={styles.username}>@{user.username}</ThemedText>
              </View>
            </View>

            <View style={styles.actionsRow}>
              {!isSelf ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={() => {
                    void handleOpenMessage();
                  }}
                  disabled={isLoadingDm}
                >
                  {isLoadingDm ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                      <ThemedText style={styles.primaryButtonText}>Nhắn tin</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}

                <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowProfileDetails((prev) => !prev)}
              >
                <Ionicons name="person-outline" size={18} color={DiscordColors.textPrimary} />
                <ThemedText style={styles.secondaryButtonText}>Xem hồ sơ</ThemedText>
              </TouchableOpacity>
            </View>

            {!isSelf && (
              <View style={styles.actionsRow}>
                {friendInfo?.friendshipStatus === 'ACCEPTED' ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={async () => {
                      if (friendInfo.friendshipId) {
                        setIsFriendLoading(true);
                        try {
                          await unfriend(friendInfo.friendshipId);
                          await fetchFriendship();
                        } finally {
                          setIsFriendLoading(false);
                        }
                      }
                    }}
                    disabled={isFriendLoading}
                  >
                    {isFriendLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="person-remove-outline" size={18} color="#fff" />
                        <ThemedText style={styles.primaryButtonText}>Hủy kết bạn</ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                ) : friendInfo?.friendshipStatus === 'PENDING' ? (
                  friendInfo.isSender ? (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={async () => {
                        if (friendInfo.friendshipId) {
                          setIsFriendLoading(true);
                          try {
                            await cancelFriendRequest(friendInfo.friendshipId);
                            await fetchFriendship();
                          } finally {
                            setIsFriendLoading(false);
                          }
                        }
                      }}
                      disabled={isFriendLoading}
                    >
                      {isFriendLoading ? (
                        <ActivityIndicator size="small" color={DiscordColors.textPrimary} />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={18} color={DiscordColors.textPrimary} />
                          <ThemedText style={styles.secondaryButtonText}>Hủy lời mời</ThemedText>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={async () => {
                        if (friendInfo.friendshipId) {
                          setIsFriendLoading(true);
                          try {
                            await acceptFriendRequest(friendInfo.friendshipId);
                            await fetchFriendship();
                          } finally {
                            setIsFriendLoading(false);
                          }
                        }
                      }}
                      disabled={isFriendLoading}
                    >
                      {isFriendLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="person-add-outline" size={18} color="#fff" />
                          <ThemedText style={styles.primaryButtonText}>Chấp nhận kết bạn</ThemedText>
                        </>
                      )}
                    </TouchableOpacity>
                  )
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={async () => {
                      setIsFriendLoading(true);
                      try {
                        await sendFriendRequest(Number(user.id));
                        await fetchFriendship();
                      } finally {
                        setIsFriendLoading(false);
                      }
                    }}
                    disabled={isFriendLoading}
                  >
                    {isFriendLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="person-add-outline" size={18} color="#fff" />
                        <ThemedText style={styles.primaryButtonText}>Kết bạn</ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {showProfileDetails ? (
              <View style={styles.profileCard}>
                <ThemedText style={styles.profileTitle}>Thông tin cơ bản</ThemedText>
                <View style={styles.profileRow}>
                  <ThemedText style={styles.profileLabel}>Trạng thái</ThemedText>
                  <ThemedText style={styles.profileValue}>{effectiveStatus}</ThemedText>
                </View>
                <View style={styles.profileRow}>
                  <ThemedText style={styles.profileLabel}>User ID</ThemedText>
                  <ThemedText style={styles.profileValue}>{String(user.id)}</ThemedText>
                </View>
                {user.bio ? (
                  <View style={styles.bioWrap}>
                    <ThemedText style={styles.profileLabel}>Giới thiệu</ThemedText>
                    <ThemedText style={styles.bioText}>{user.bio}</ThemedText>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: DiscordColors.secondaryBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    gap: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: DiscordColors.textMuted,
    opacity: 0.7,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: DiscordColors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  username: {
    color: DiscordColors.textSecondary,
    fontSize: 14,
    marginTop: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.md,
  },
  primaryButton: {
    backgroundColor: DiscordColors.blurple,
  },
  dangerButton: {
    backgroundColor: DiscordColors.red,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: DiscordColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  profileTitle: {
    color: DiscordColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLabel: {
    color: DiscordColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  profileValue: {
    color: DiscordColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  bioWrap: {
    marginTop: 2,
    gap: 6,
  },
  bioText: {
    color: DiscordColors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  nameplateImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: 120, // Constrain height to cover only the top header area
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    opacity: 0.9,
  },
});
