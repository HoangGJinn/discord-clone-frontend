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
import { AVATAR_EFFECTS, BACKGROUND_EFFECTS, NAMEPLATE_EFFECTS } from '@/constants/profileEffects';
import { useEffectStore } from '@/store/useEffectStore';

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

  const effectiveStatus = useMemo(() => {
    if (status) return status;
    return normalizeStatus(user.status);
  }, [status, user.status]);

  const displayName = user.displayName || user.username;
  const isSelf = String(currentUser?.id || '') === String(user.id);
  
  const getEffectById = useEffectStore((state) => state.getEffectById);
  
  // Resolve Banner Effect
  const dynamicBgEffect = user.bannerEffectId ? getEffectById(user.bannerEffectId) : null;
  const staticBgEffect = user.bannerEffectId && !dynamicBgEffect ? BACKGROUND_EFFECTS.find(e => String(e.id) === String(user.bannerEffectId)) : null;
  const activeBgEffectUri = dynamicBgEffect ? dynamicBgEffect.imageUrl : staticBgEffect?.uri;

  // Resolve Nameplate (Card) Effect
  const dynamicCardEffect = user.cardEffectId ? getEffectById(user.cardEffectId) : null;
  const staticCardEffect = user.cardEffectId && !dynamicCardEffect ? NAMEPLATE_EFFECTS.find(e => String(e.id) === String(user.cardEffectId)) : null;
  const activeCardEffectUri = dynamicCardEffect ? dynamicCardEffect.imageUrl : staticCardEffect?.uri;

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
            {activeBgEffectUri && (
              <Image
                source={activeBgEffectUri}
                style={[StyleSheet.absoluteFill, { zIndex: -1, borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}
                pointerEvents="none"
                contentFit="cover"
              />
            )}
            {activeCardEffectUri && (
              <Image
                source={activeCardEffectUri}
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
