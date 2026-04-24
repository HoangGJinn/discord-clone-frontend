import apiClient from '@/api/client';
import { Avatar } from '@/components/Avatar';
import { EffectModal } from '@/components/profile/EffectModal';
import { AVATAR_EFFECTS, BACKGROUND_EFFECTS, NAMEPLATE_EFFECTS } from '@/constants/profileEffects';
import { useEffectStore, ProfileEffect } from '@/store/useEffectStore';
import { ThemedText } from '@/components/themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserStatus = 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';

const normalizeStatus = (status?: string): UserStatus => {
  const value = String(status || 'OFFLINE').toUpperCase();
  if (value === 'ONLINE') return 'ONLINE';
  if (value === 'IDLE') return 'IDLE';
  if (value === 'DND') return 'DND';
  return 'OFFLINE';
};

const PLACEHOLDER_BANNER =
  'https://images.unsplash.com/photo-1636955779321-819753cd1741?auto=format&fit=crop&w=1200&q=80';

const getFileNameFromUri = (uri: string) => {
  const lastSegment = uri.split('/').pop();
  if (!lastSegment) return `avatar-${Date.now()}.jpg`;
  return lastSegment;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const previewStatus = normalizeStatus(user?.status);

  const [activeTab, setActiveTab] = useState<'MAIN' | 'SERVER'>('MAIN');
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState(user?.avatar || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { fetchEffects, getEffectsByType, getEffectById } = useEffectStore();
  const avatarEffects = getEffectsByType('AVATAR');
  const bannerEffects = getEffectsByType('BANNER');
  const cardEffects = getEffectsByType('CARD');

  // Combine local constants with database effects
  const combinedAvatarEffects = useMemo(() => [
    ...AVATAR_EFFECTS,
    ...avatarEffects.map(e => ({ id: String(e.id), name: e.name, uri: e.imageUrl }))
  ], [avatarEffects]);

  const combinedBannerEffects = useMemo(() => [
    ...BACKGROUND_EFFECTS,
    ...bannerEffects.map(e => ({ id: String(e.id), name: e.name, uri: e.imageUrl }))
  ], [bannerEffects]);

  const combinedCardEffects = useMemo(() => [
    ...NAMEPLATE_EFFECTS,
    ...cardEffects.map(e => ({ id: String(e.id), name: e.name, uri: e.imageUrl }))
  ], [cardEffects]);

  const [selectedAvatarEffect, setSelectedAvatarEffect] = useState<any>(
    user?.avatarEffectId ? getEffectById(user.avatarEffectId) || AVATAR_EFFECTS.find((e) => String(e.id) === String(user.avatarEffectId)) || null : null
  );
  const [selectedBgEffect, setSelectedBgEffect] = useState<any>(
    user?.bannerEffectId ? getEffectById(user.bannerEffectId) || BACKGROUND_EFFECTS.find((e) => String(e.id) === String(user.bannerEffectId)) || null : null
  );
  const [selectedCardEffect, setSelectedCardEffect] = useState<any>(
    user?.cardEffectId ? getEffectById(user.cardEffectId) || NAMEPLATE_EFFECTS.find((e) => String(e.id) === String(user.cardEffectId)) || null : null
  );
  const [effectModalType, setEffectModalType] = useState<'AVATAR' | 'BACKGROUND' | 'CARD' | null>(null);
  const isNitro = Boolean(user?.isPremium);

  const openNitroPrompt = () => {
    Alert.alert(
      'Cần Nitro',
      'Bạn cần có Nitro để sử dụng các hiệu ứng hồ sơ.',
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: 'Mua Nitro',
          onPress: () => router.push('/nitro'),
        },
      ],
    );
  };

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      String(displayName).trim() !== String(user.displayName || user.username || '').trim() ||
      String(pronouns).trim() !== String(user.pronouns || '').trim() ||
      String(bio).trim() !== String(user.bio || '').trim() ||
      String(avatarUri || '') !== String(user.avatar || '') ||
      ((isNitro ? selectedAvatarEffect?.id : '') || '') !== (user.avatarEffectId || '') ||
      ((isNitro ? selectedBgEffect?.id : '') || '') !== (user.bannerEffectId || '') ||
      ((isNitro ? selectedCardEffect?.id : '') || '') !== (user.cardEffectId || '')
    );
  }, [
    avatarUri,
    bio,
    displayName,
    pronouns,
    user,
    selectedAvatarEffect,
    selectedBgEffect,
    selectedCardEffect,
    isNitro,
  ]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredWrap}>
          <ThemedText style={styles.emptyText}>Không tìm thấy thông tin người dùng.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền truy cập', 'Bạn cần cấp quyền thư viện ảnh để đổi avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setIsUploadingAvatar(true);

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append('file', blob, asset.fileName || 'avatar.jpg');
      } else {
        formData.append('file', {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || getFileNameFromUri(asset.uri),
        } as any);
      }

      const uploadResponse = await apiClient.post('upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('DEBUG: Kết quả upload avatar:', uploadResponse.data);

      const uploadedUrl = uploadResponse.data?.url || uploadResponse.data;
      if (!uploadedUrl) {
        console.error('DEBUG: Server không trả về URL. Data:', uploadResponse.data);
        throw new Error('Không nhận được URL avatar từ server.');
      }

      setAvatarUri(String(uploadedUrl));
    } catch (error: any) {
      console.error('DEBUG: Lỗi chi tiết khi upload avatar:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      });
      Alert.alert('Không thể đổi avatar', error?.message || 'Vui lòng thử lại.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!isDirty || isSaving) return;

    const trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName.length < 2) {
      Alert.alert('Tên hiển thị chưa hợp lệ', 'Tên hiển thị cần tối thiểu 2 ký tự.');
      return;
    }

    const payload = {
      displayName: trimmedDisplayName,
      pronouns: pronouns.trim() || null,
      bio: bio.trim() || null,
      avatarUrl: avatarUri || null,
      avatarEffectId: isNitro ? selectedAvatarEffect?.id || '' : '',
      bannerEffectId: isNitro ? selectedBgEffect?.id || '' : '',
      cardEffectId: isNitro ? selectedCardEffect?.id || '' : '',
    };

    setIsSaving(true);
    try {
      const response = await apiClient.put('/users/profile', payload);
      const data = response?.data || {};

      updateUser({
        displayName: data.displayName ?? trimmedDisplayName,
        pronouns: data.pronouns ?? (pronouns.trim() || undefined),
        bio: data.bio ?? (bio.trim() || undefined),
        avatar: data.avatarUrl ?? (avatarUri || undefined),
        avatarEffectId: isNitro
          ? data.avatarEffectId ?? (selectedAvatarEffect?.id || undefined)
          : undefined,
        bannerEffectId: isNitro
          ? data.bannerEffectId ?? (selectedBgEffect?.id || undefined)
          : undefined,
        cardEffectId: isNitro
          ? data.cardEffectId ?? (selectedCardEffect?.id || undefined)
          : undefined,
      });

      Alert.alert('Đã lưu', 'Thông tin hồ sơ đã được cập nhật.');
      router.back();
    } catch (error: any) {
      const statusCode = error?.response?.status;
      const message = statusCode === 401 || statusCode === 403
        ? 'Phiên đăng nhập không hợp lệ hoặc không đủ quyền. Hãy đăng xuất rồi đăng nhập lại.'
        : error?.response?.data?.message ||
          error?.message ||
          'Backend chưa hỗ trợ endpoint cập nhật hồ sơ đầy đủ.';
      Alert.alert('Không thể lưu hồ sơ', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={DiscordColors.textPrimary} />
        </TouchableOpacity>

        <ThemedText style={styles.headerTitle}>Hồ sơ</ThemedText>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => {
            void handleSave();
          }}
          disabled={!isDirty || isSaving}
        >
          <ThemedText style={[styles.saveText, (!isDirty || isSaving) && styles.saveTextDisabled]}>
            {isSaving ? 'Đang lưu...' : 'Lưu'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'MAIN' && styles.activeTabItem]}
          onPress={() => setActiveTab('MAIN')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'MAIN' && styles.activeTabText]}>Hồ Sơ Chính</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'SERVER' && styles.activeTabItem]}
          onPress={() => {
            setActiveTab('SERVER');
            Alert.alert('Placeholder', 'Hồ sơ theo máy chủ sẽ được phát triển sau.');
          }}
        >
          <ThemedText style={[styles.tabText, activeTab === 'SERVER' && styles.activeTabText]}>Hồ Sơ Theo Máy Chủ</ThemedText>
         </TouchableOpacity>
       </View>
 
       <ScrollView contentContainerStyle={styles.scrollContent}>
         <View style={styles.previewCard}>
           <View>
             <Image source={{ uri: PLACEHOLDER_BANNER }} style={styles.bannerImage} contentFit="cover" />
             {isNitro && selectedBgEffect && (
               <Image
                 source={selectedBgEffect.imageUrl || selectedBgEffect.uri}
                 style={[styles.bannerImage, styles.bannerEffectImage, { position: 'absolute' }]}
                 contentFit="cover"
               />
             )}
           </View>

           <View style={styles.avatarArea}>
             <View>
               <Avatar
                 name={displayName || user.username}
                 uri={avatarUri || undefined}
                 size={90}
                 status={previewStatus}
               />
               {isNitro && selectedAvatarEffect && (
                 <Image source={selectedAvatarEffect.imageUrl || selectedAvatarEffect.uri} style={styles.avatarEffectImage} pointerEvents="none" />
               )}
               <TouchableOpacity
                 style={styles.editAvatarBtn}
                 onPress={() => {
                   void handlePickAvatar();
                 }}
                 disabled={isUploadingAvatar}
               >
                 <Ionicons
                   name={isUploadingAvatar ? 'cloud-upload-outline' : 'pencil'}
                   size={16}
                   color={DiscordColors.textPrimary}
                 />
               </TouchableOpacity>
             </View>
 
           </View>
 
           <View style={styles.previewTextArea}>
             <ThemedText style={styles.previewDisplayName}>{displayName || user.username}</ThemedText>
             <ThemedText style={styles.previewUsername}>@{user.username}</ThemedText>
             {pronouns ? <ThemedText style={styles.previewSubText}>{pronouns}</ThemedText> : null}
             {bio ? <ThemedText style={styles.previewSubText}>{bio}</ThemedText> : null}
           </View>

           {!isNitro ? (
             <View style={styles.nitroNoticeCard}>
               <View style={styles.nitroNoticeHeader}>
                 <Ionicons name="diamond-outline" size={18} color={DiscordColors.textPrimary} />
                 <ThemedText style={styles.nitroNoticeTitle}>Cần Nitro để dùng hiệu ứng</ThemedText>
               </View>
               <ThemedText style={styles.nitroNoticeText}>
                 Trang trí ảnh đại diện, Hiệu ứng nền bìa và Hiệu ứng bảng tên chỉ dành cho Nitro.
               </ThemedText>
               <TouchableOpacity style={styles.buyNitroBtn} onPress={() => router.push('/nitro')}>
                 <ThemedText style={styles.buyNitroText}>Mua Nitro</ThemedText>
               </TouchableOpacity>
             </View>
           ) : null}
         </View>
 
         <View style={styles.formCard}>
           <View style={styles.fieldWrap}>
             <ThemedText style={styles.fieldLabel}>Tên hiển thị</ThemedText>
             <TextInput
               value={displayName}
               onChangeText={setDisplayName}
               style={styles.input}
               placeholder="Nhập tên hiển thị"
               placeholderTextColor={DiscordColors.textMuted}
               maxLength={32}
             />
           </View>
 
           <View style={styles.fieldWrap}>
             <ThemedText style={styles.fieldLabel}>Đại từ nhân xưng</ThemedText>
             <TextInput
               value={pronouns}
               onChangeText={setPronouns}
               style={styles.input}
               placeholder="Ví dụ: she/her, he/him, they/them"
               placeholderTextColor={DiscordColors.textMuted}
               maxLength={40}
             />
           </View>
 
           <View style={styles.fieldWrap}>
             <ThemedText style={styles.fieldLabel}>Tiểu sử</ThemedText>
             <TextInput
               value={bio}
               onChangeText={setBio}
               style={[styles.input, styles.bioInput]}
               placeholder="Giới thiệu bản thân của bạn"
               placeholderTextColor={DiscordColors.textMuted}
               multiline
               textAlignVertical="top"
               maxLength={190}
             />
             <ThemedText style={styles.counterText}>{190 - bio.length}</ThemedText>
           </View>
 
           <View style={styles.fieldWrap}>
             <ThemedText style={styles.fieldLabel}>Trang Trí Ảnh Đại Diện</ThemedText>
             <TouchableOpacity
               style={[styles.placeholderRow, !isNitro && styles.lockedRow]}
               onPress={() => {
                 setEffectModalType('AVATAR');
               }}
             >
               {selectedAvatarEffect ? (
                 <View style={styles.thumbnailWrapper}>
                   <Image source={selectedAvatarEffect.imageUrl || selectedAvatarEffect.uri} style={styles.effectThumbnail} contentFit="contain" />
                 </View>
               ) : (
                 <Ionicons name="close" size={24} color={DiscordColors.textSecondary} />
               )}
               <ThemedText style={[styles.placeholderText, !selectedAvatarEffect && styles.placeholderTextEmpty]}>
                 {selectedAvatarEffect ? selectedAvatarEffect.name : 'Chưa chọn hiệu ứng'}
               </ThemedText>
               <Ionicons name="chevron-forward" size={20} color={DiscordColors.textMuted} />
             </TouchableOpacity>
             {!isNitro ? <ThemedText style={styles.lockedHint}>Bạn cần Nitro để sử dụng hiệu ứng này.</ThemedText> : null}
           </View>
 
           <View style={styles.fieldWrap}>
             <ThemedText style={styles.fieldLabel}>Hiệu Ứng Nền Bìa</ThemedText>
             <TouchableOpacity
               style={[styles.placeholderRow, !isNitro && styles.lockedRow]}
               onPress={() => {
                 setEffectModalType('BACKGROUND');
               }}
             >
               {selectedBgEffect ? (
                 <View style={styles.thumbnailWrapper}>
                   <Image source={selectedBgEffect.imageUrl || selectedBgEffect.uri} style={styles.effectThumbnail} contentFit="contain" />
                 </View>
               ) : (
                 <Ionicons name="close" size={24} color={DiscordColors.textSecondary} />
               )}
               <ThemedText style={[styles.placeholderText, !selectedBgEffect && styles.placeholderTextEmpty]}>
                 {selectedBgEffect ? selectedBgEffect.name : 'Chưa chọn hiệu ứng'}
               </ThemedText>
               <Ionicons name="chevron-forward" size={20} color={DiscordColors.textMuted} />
             </TouchableOpacity>
             {!isNitro ? <ThemedText style={styles.lockedHint}>Bạn cần Nitro để sử dụng hiệu ứng này.</ThemedText> : null}
           </View>
 
           <View style={styles.fieldWrap}>
             <ThemedText style={styles.fieldLabel}>Hiệu Ứng Bảng Tên</ThemedText>
             <TouchableOpacity
               style={[styles.placeholderRow, !isNitro && styles.lockedRow]}
               onPress={() => {
                 setEffectModalType('CARD');
               }}
             >
               {selectedCardEffect ? (
                 <View style={styles.thumbnailWrapper}>
                   <Image source={selectedCardEffect.imageUrl || selectedCardEffect.uri} style={styles.effectThumbnail} contentFit="contain" />
                 </View>
               ) : (
                 <Ionicons name="close" size={24} color={DiscordColors.textSecondary} />
               )}
               <ThemedText style={[styles.placeholderText, !selectedCardEffect && styles.placeholderTextEmpty]}>
                 {selectedCardEffect ? selectedCardEffect.name : 'Chưa chọn hiệu ứng'}
               </ThemedText>
               <Ionicons name="chevron-forward" size={20} color={DiscordColors.textMuted} />
             </TouchableOpacity>
             {!isNitro ? <ThemedText style={styles.lockedHint}>Bạn cần Nitro để sử dụng hiệu ứng này.</ThemedText> : null}
           </View>
         </View>
       </ScrollView>
 
       <EffectModal
         visible={effectModalType === 'AVATAR'}
         title="Trang Trí Ảnh Đại Diện"
         data={combinedAvatarEffects}
         currentSelectedId={String(selectedAvatarEffect?.id || '')}
         onSelect={setSelectedAvatarEffect}
         canSelect={isNitro}
         lockHint="Bạn cần Nitro để sử dụng Trang trí ảnh đại diện."
         onPressLockedAction={openNitroPrompt}
         onClose={() => setEffectModalType(null)}
       />
       <EffectModal
         visible={effectModalType === 'BACKGROUND'}
         title="Hiệu Ứng Nền Bìa"
         data={combinedBannerEffects}
         currentSelectedId={String(selectedBgEffect?.id || '')}
         onSelect={setSelectedBgEffect}
         canSelect={isNitro}
         lockHint="Bạn cần Nitro để sử dụng Hiệu ứng nền bìa."
         onPressLockedAction={openNitroPrompt}
         onClose={() => setEffectModalType(null)}
       />
       <EffectModal
         visible={effectModalType === 'CARD'}
         title="Hiệu Ứng Bảng Tên"
         data={combinedCardEffects}
         currentSelectedId={String(selectedCardEffect?.id || '')}
         onSelect={setSelectedCardEffect}
         canSelect={isNitro}
         lockHint="Bạn cần Nitro để sử dụng Hiệu ứng bảng tên."
         onPressLockedAction={openNitroPrompt}
         onClose={() => setEffectModalType(null)}
       />
     </SafeAreaView>
   );
 }
 
 const styles = StyleSheet.create({
   container: {
     flex: 1,
     backgroundColor: DiscordColors.primaryBackground,
   },
   centeredWrap: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
   },
   emptyText: {
     color: DiscordColors.textMuted,
   },
   header: {
     height: 56,
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     paddingHorizontal: Spacing.md,
   },
   headerIconBtn: {
     width: 36,
     height: 36,
     borderRadius: 18,
     alignItems: 'center',
     justifyContent: 'center',
   },
   headerTitle: {
     color: DiscordColors.textPrimary,
     fontSize: 20,
     fontWeight: '800',
   },
   saveBtn: {
     minWidth: 52,
     alignItems: 'flex-end',
   },
   saveText: {
     color: DiscordColors.blurple,
     fontSize: 16,
     fontWeight: '700',
   },
   saveTextDisabled: {
     color: DiscordColors.textMuted,
   },
   tabRow: {
     height: 56,
     borderBottomWidth: StyleSheet.hairlineWidth,
     borderBottomColor: DiscordColors.divider,
     flexDirection: 'row',
   },
   tabItem: {
     flex: 1,
     alignItems: 'center',
     justifyContent: 'center',
     borderBottomWidth: 3,
     borderBottomColor: 'transparent',
   },
   activeTabItem: {
     borderBottomColor: DiscordColors.blurple,
   },
   tabText: {
     color: DiscordColors.textSecondary,
     fontSize: 15,
     fontWeight: '700',
   },
   activeTabText: {
     color: DiscordColors.textPrimary,
   },
   scrollContent: {
     paddingBottom: 28,
   },
   previewCard: {
     backgroundColor: '#1F212B',
   },
   bannerImage: {
     width: '100%',
     height: 190,
   },
   avatarArea: {
     marginTop: -42,
     paddingHorizontal: Spacing.lg,
     flexDirection: 'row',
     alignItems: 'center',
     gap: Spacing.md,
   },
   editAvatarBtn: {
     position: 'absolute',
     right: -6,
     top: 2,
     width: 34,
     height: 34,
     borderRadius: 17,
     backgroundColor: '#11131A',
     alignItems: 'center',
     justifyContent: 'center',
     borderWidth: 1,
     borderColor: DiscordColors.divider,
     zIndex: 10,
   },
   previewTextArea: {
     paddingHorizontal: Spacing.lg,
     paddingVertical: Spacing.md,
     gap: 2,
   },
  nitroNoticeCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 12,
    padding: Spacing.md,
    backgroundColor: 'rgba(88,101,242,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(88,101,242,0.45)',
    gap: 8,
  },
  nitroNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nitroNoticeTitle: {
    color: DiscordColors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  nitroNoticeText: {
    color: DiscordColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  buyNitroBtn: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: DiscordColors.blurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNitroText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
   previewDisplayName: {
     color: DiscordColors.textPrimary,
     fontSize: 21,
     fontWeight: '800',
   },
   previewUsername: {
     color: DiscordColors.textSecondary,
     fontSize: 16,
     fontWeight: '600',
   },
   previewSubText: {
     color: DiscordColors.textSecondary,
     fontSize: 14,
     marginTop: 4,
   },
   formCard: {
     marginTop: Spacing.md,
     marginHorizontal: Spacing.lg,
     borderRadius: 16,
     backgroundColor: '#2B2F37',
     padding: Spacing.md,
     gap: Spacing.md,
   },
   fieldWrap: {
     gap: 8,
   },
   fieldLabel: {
     color: DiscordColors.textSecondary,
     fontSize: 15,
     fontWeight: '700',
   },
   input: {
     backgroundColor: '#191A24',
     borderRadius: 12,
     minHeight: 54,
     color: DiscordColors.textPrimary,
     fontSize: 18 / 2,
     paddingHorizontal: Spacing.md,
     paddingVertical: 12,
   },
   bioInput: {
     minHeight: 180,
   },
   counterText: {
     alignSelf: 'flex-end',
     color: DiscordColors.textMuted,
     fontSize: 14,
   },
   placeholderRow: {
     backgroundColor: '#191A24',
     borderRadius: 12,
     minHeight: 54,
     paddingHorizontal: Spacing.md,
     alignItems: 'center',
     flexDirection: 'row',
     gap: Spacing.md,
   },
  lockedRow: {
    opacity: 0.72,
  },
  lockedHint: {
    color: DiscordColors.textMuted,
    fontSize: 12,
  },
   placeholderText: {
     flex: 1,
     color: DiscordColors.textPrimary,
     fontSize: 17 / 2,
     fontWeight: '700',
   },
   bannerEffectImage: {
     zIndex: 2,
   },
   avatarEffectImage: {
     position: 'absolute',
     top: -15,
     left: -15,
     width: 120,
     height: 120,
     zIndex: 5,
   },
   placeholderTextEmpty: {
     color: DiscordColors.textSecondary,
     fontWeight: '500',
   },
   thumbnailWrapper: {
     width: 40,
     height: 40,
     borderRadius: 8,
     backgroundColor: '#202225',
     alignItems: 'center',
     justifyContent: 'center',
     overflow: 'hidden',
   },
   effectThumbnail: {
     width: '100%',
     height: '100%',
   },
 });
