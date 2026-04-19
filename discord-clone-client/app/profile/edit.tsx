import apiClient from '@/api/client';
import { Avatar } from '@/components/Avatar';
import { EffectModal } from '@/components/profile/EffectModal';
import { AVATAR_EFFECTS, BACKGROUND_EFFECTS, NAMEPLATE_EFFECTS } from '@/constants/profileEffects';
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
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
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
  { value: 'DND', label: 'Vui lòng không làm phiền', icon: 'remove-circle', color: '#F23F43' },
  { value: 'OFFLINE', label: 'Vô hình', icon: 'radio-button-off', color: '#949BA4' },
];

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

  const [activeTab, setActiveTab] = useState<'MAIN' | 'SERVER'>('MAIN');
  const [status, setStatus] = useState<UserStatus>(normalizeStatus(user?.status));
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState(user?.avatar || '');

  const [isStatusSheetVisible, setIsStatusSheetVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [selectedAvatarEffect, setSelectedAvatarEffect] = useState<any>(
    user?.avatarEffectId ? AVATAR_EFFECTS.find((e) => e.id === user.avatarEffectId) || null : null
  );
  const [selectedBgEffect, setSelectedBgEffect] = useState<any>(
    user?.bannerEffectId ? BACKGROUND_EFFECTS.find((e) => e.id === user.bannerEffectId) || null : null
  );
  const [selectedCardEffect, setSelectedCardEffect] = useState<any>(
    user?.cardEffectId ? NAMEPLATE_EFFECTS.find((e) => e.id === user.cardEffectId) || null : null
  );
  const [effectModalType, setEffectModalType] = useState<'AVATAR' | 'BACKGROUND' | 'CARD' | null>(null);

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      String(displayName).trim() !== String(user.displayName || user.username || '').trim() ||
      String(pronouns).trim() !== String(user.pronouns || '').trim() ||
      String(bio).trim() !== String(user.bio || '').trim() ||
      String(avatarUri || '') !== String(user.avatar || '') ||
      status !== normalizeStatus(user.status) ||
      (selectedAvatarEffect?.id || '') !== (user.avatarEffectId || '') ||
      (selectedBgEffect?.id || '') !== (user.bannerEffectId || '') ||
      (selectedCardEffect?.id || '') !== (user.cardEffectId || '')
    );
  }, [avatarUri, bio, displayName, pronouns, status, user, selectedAvatarEffect, selectedBgEffect, selectedCardEffect]);

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
      avatarEffectId: selectedAvatarEffect?.id || "",
      bannerEffectId: selectedBgEffect?.id || "",
      cardEffectId: selectedCardEffect?.id || "",
    };

    setIsSaving(true);
    try {
      const previousStatus = normalizeStatus(user.status);
      const response = await apiClient.put('/users/profile', payload);
      const data = response?.data || {};

      if (status !== previousStatus) {
        await apiClient.put('/users/me/status', null, {
          params: {
            userId: Number(user.id),
            status,
          },
        });
      }

      updateUser({
        displayName: data.displayName ?? trimmedDisplayName,
        pronouns: data.pronouns ?? (pronouns.trim() || undefined),
        bio: data.bio ?? (bio.trim() || undefined),
        avatar: data.avatarUrl ?? (avatarUri || undefined),
        avatarEffectId: data.avatarEffectId ?? (selectedAvatarEffect?.id || undefined),
        bannerEffectId: data.bannerEffectId ?? (selectedBgEffect?.id || undefined),
        cardEffectId: data.cardEffectId ?? (selectedCardEffect?.id || undefined),
        status,
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
             {selectedBgEffect && (
               <Image source={selectedBgEffect.uri} style={[styles.bannerImage, styles.bannerEffectImage, { position: 'absolute' }]} contentFit="cover" />
             )}
           </View>

           <View style={styles.avatarArea}>
             <View>
               <Avatar
                 name={displayName || user.username}
                 uri={avatarUri || undefined}
                 size={90}
                 status={status}
               />
               {selectedAvatarEffect && (
                 <Image source={selectedAvatarEffect.uri} style={styles.avatarEffectImage} pointerEvents="none" />
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
 
             <TouchableOpacity style={styles.statusActionBtn} onPress={() => setIsStatusSheetVisible(true)}>
               <Ionicons name="radio-button-on-outline" size={20} color={DiscordColors.textPrimary} />
               <ThemedText style={styles.statusActionText}>Thêm trạng thái</ThemedText>
             </TouchableOpacity>
           </View>
 
           <View style={styles.previewTextArea}>
             <ThemedText style={styles.previewDisplayName}>{displayName || user.username}</ThemedText>
             <ThemedText style={styles.previewUsername}>@{user.username}</ThemedText>
             {pronouns ? <ThemedText style={styles.previewSubText}>{pronouns}</ThemedText> : null}
             {bio ? <ThemedText style={styles.previewSubText}>{bio}</ThemedText> : null}
           </View>
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
               style={styles.placeholderRow}
               onPress={() => setEffectModalType('AVATAR')}
             >
               {selectedAvatarEffect ? (
                 <View style={styles.thumbnailWrapper}>
                   <Image source={selectedAvatarEffect.uri} style={styles.effectThumbnail} contentFit="contain" />
                 </View>
               ) : (
                 <Ionicons name="close" size={24} color={DiscordColors.textSecondary} />
               )}
               <ThemedText style={[styles.placeholderText, !selectedAvatarEffect && styles.placeholderTextEmpty]}>
                 {selectedAvatarEffect ? selectedAvatarEffect.name : 'Chưa chọn hiệu ứng'}
               </ThemedText>
               <Ionicons name="chevron-forward" size={20} color={DiscordColors.textMuted} />
             </TouchableOpacity>
           </View>
 
           <View style={styles.fieldWrap}>
             <ThemedText style={styles.fieldLabel}>Hiệu Ứng Nền Bìa</ThemedText>
             <TouchableOpacity
               style={styles.placeholderRow}
               onPress={() => setEffectModalType('BACKGROUND')}
             >
               {selectedBgEffect ? (
                 <View style={styles.thumbnailWrapper}>
                   <Image source={selectedBgEffect.uri} style={styles.effectThumbnail} contentFit="contain" />
                 </View>
               ) : (
                 <Ionicons name="close" size={24} color={DiscordColors.textSecondary} />
               )}
               <ThemedText style={[styles.placeholderText, !selectedBgEffect && styles.placeholderTextEmpty]}>
                 {selectedBgEffect ? selectedBgEffect.name : 'Chưa chọn hiệu ứng'}
               </ThemedText>
               <Ionicons name="chevron-forward" size={20} color={DiscordColors.textMuted} />
             </TouchableOpacity>
           </View>
 
           <View style={styles.fieldWrap}>
             <ThemedText style={styles.fieldLabel}>Hiệu Ứng Bảng Tên</ThemedText>
             <TouchableOpacity
               style={styles.placeholderRow}
               onPress={() => setEffectModalType('CARD')}
             >
               {selectedCardEffect ? (
                 <View style={styles.thumbnailWrapper}>
                   <Image source={selectedCardEffect.uri} style={styles.effectThumbnail} contentFit="contain" />
                 </View>
               ) : (
                 <Ionicons name="close" size={24} color={DiscordColors.textSecondary} />
               )}
               <ThemedText style={[styles.placeholderText, !selectedCardEffect && styles.placeholderTextEmpty]}>
                 {selectedCardEffect ? selectedCardEffect.name : 'Chưa chọn hiệu ứng'}
               </ThemedText>
               <Ionicons name="chevron-forward" size={20} color={DiscordColors.textMuted} />
             </TouchableOpacity>
           </View>
         </View>
       </ScrollView>
 
       <Modal
         visible={isStatusSheetVisible}
         transparent
         animationType="fade"
         onRequestClose={() => setIsStatusSheetVisible(false)}
       >
         <View style={styles.modalOverlay}>
           <Pressable style={styles.modalBackdrop} onPress={() => setIsStatusSheetVisible(false)} />
           <View style={styles.statusSheet}>
             <View style={styles.sheetHandle} />
             <ThemedText style={styles.statusSheetTitle}>Thay đổi trạng thái trực tuyến</ThemedText>
             <ThemedText style={styles.statusSectionLabel}>Trạng thái trực tuyến</ThemedText>
 
             <View style={styles.statusList}>
               {STATUS_OPTIONS.map((option) => {
                 const selected = status === option.value;
                 return (
                   <TouchableOpacity
                     key={option.value}
                     style={styles.statusRow}
                     onPress={() => {
                       setStatus(option.value);
                       setIsStatusSheetVisible(false);
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
           </View>
         </View>
       </Modal>

       <EffectModal
         visible={effectModalType === 'AVATAR'}
         title="Trang Trí Ảnh Đại Diện"
         data={AVATAR_EFFECTS}
         currentSelectedId={selectedAvatarEffect?.id}
         onSelect={setSelectedAvatarEffect}
         onClose={() => setEffectModalType(null)}
       />
       <EffectModal
         visible={effectModalType === 'BACKGROUND'}
         title="Hiệu Ứng Nền Bìa"
         data={BACKGROUND_EFFECTS}
         currentSelectedId={selectedBgEffect?.id}
         onSelect={setSelectedBgEffect}
         onClose={() => setEffectModalType(null)}
       />
       <EffectModal
         visible={effectModalType === 'CARD'}
         title="Hiệu Ứng Bảng Tên"
         data={NAMEPLATE_EFFECTS}
         currentSelectedId={selectedCardEffect?.id}
         onSelect={setSelectedCardEffect}
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
   statusActionBtn: {
     marginTop: 18,
     minHeight: 44,
     borderRadius: 22,
     backgroundColor: '#11131A',
     paddingHorizontal: 16,
     alignItems: 'center',
     flexDirection: 'row',
     gap: 8,
   },
   statusActionText: {
     color: DiscordColors.textPrimary,
     fontSize: 17 / 2,
     fontWeight: '700',
   },
   previewTextArea: {
     paddingHorizontal: Spacing.lg,
     paddingVertical: Spacing.md,
     gap: 2,
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
   placeholderText: {
     flex: 1,
     color: DiscordColors.textPrimary,
     fontSize: 17 / 2,
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
   statusSheetTitle: {
     color: DiscordColors.textPrimary,
     fontSize: 22,
     fontWeight: '800',
     textAlign: 'center',
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
