import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { AttachmentPreview } from './AttachmentPreview';
import { EmojiPicker } from './EmojiPicker';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import apiClient from '@/api/client';
import { getFilenameFromUrl, isImageAttachment, isImageUrl } from '@/utils/attachments';
import { Attachment, ReplyMessage } from '@/types/dm';
import { pickGifAttachment } from '@/services/giphyService';
import { HAS_GIPHY_API_KEY } from '@/constants/appConfig';

// ─── Props Interface ─────────────────────────────────────────
interface ChatInputProps {
  /** Called when the user submits a message */
  onSend: (content: string, attachments?: Attachment[], replyToId?: string) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Disables the input while sending */
  disabled?: boolean;
  /** Selected message being replied to */
  replyToMessage?: ReplyMessage | null;
  /** Clear reply target */
  onCancelReply?: () => void;
}

interface PendingAttachment {
  id: string;
  uri: string;
  fileName: string;
  mimeType?: string;
  isImage: boolean;
  isUploading: boolean;
  attachment?: Attachment;
}

// ─── Component (SRP: Only handles text input and send action) ─
export function ChatInput({
  onSend,
  placeholder = 'Send a message...',
  disabled = false,
  replyToMessage,
  onCancelReply,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const isUploading = pendingAttachments.some((item) => item.isUploading);
  const uploadedAttachments = pendingAttachments
    .map((item) => item.attachment)
    .filter((item): item is Attachment => Boolean(item?.url));
  const canSend = (text.trim().length > 0 || uploadedAttachments.length > 0) && !disabled && !isUploading;

  const uploadAttachment = useCallback(
    async (input: {
      uri: string;
      fileName: string;
      mimeType?: string;
      isImage: boolean;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setPendingAttachments((prev) => [
        ...prev,
        {
          id,
          uri: input.uri,
          fileName: input.fileName,
          mimeType: input.mimeType,
          isImage: input.isImage,
          isUploading: true,
        },
      ]);

      try {
        const formData = new FormData();
        formData.append('file', {
          uri: input.uri,
          type: input.mimeType || (input.isImage ? 'image/jpeg' : 'application/octet-stream'),
          name: input.fileName,
        } as any);

        const response = await apiClient.post('/upload', formData, {
          params: {
            resourceType: input.isImage ? 'image' : 'raw',
          },
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const uploadedUrl = response.data?.url || response.data;
        if (!uploadedUrl) {
          throw new Error('Upload response is missing URL');
        }
        const uploadedFilename = response.data?.filename || input.fileName;
        const uploadedContentType = response.data?.contentType || input.mimeType;

        setPendingAttachments((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  attachment: {
                    url: String(uploadedUrl),
                    filename: uploadedFilename,
                    contentType: uploadedContentType,
                  },
                  isUploading: false,
                }
              : item,
          ),
        );
      } catch (err: any) {
        setPendingAttachments((prev) => prev.filter((item) => item.id !== id));
        const status = err?.response?.status;
        const serverMessage = err?.response?.data?.error || err?.response?.data?.message;
        Alert.alert(
          'Upload Failed',
          serverMessage ||
            (status ? `Upload failed with status ${status}` : err?.message) ||
            'Could not upload attachment. Please try again.',
        );
      }
    },
    [],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && uploadedAttachments.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(
      trimmed || ' ',
      uploadedAttachments.length ? uploadedAttachments : undefined,
      replyToMessage?.id,
    );
    setText('');
    setPendingAttachments([]);
    onCancelReply?.();
  }, [text, uploadedAttachments, onSend, replyToMessage?.id, onCancelReply]);

  const replyAuthor =
    replyToMessage?.sender?.displayName ||
    replyToMessage?.sender?.username ||
    replyToMessage?.senderName ||
    'Unknown';

  const replySummary = (() => {
    if (!replyToMessage) {
      return '';
    }

    if (replyToMessage.deleted) {
      return 'Original message deleted';
    }

    const content = replyToMessage.content?.trim();
    if (content) {
      return content;
    }

    const attachments = replyToMessage.attachments || [];
    if (!attachments.length) {
      return 'Message';
    }

    const hasImage = attachments.some((item) => isImageAttachment(item));
    if (hasImage && attachments.length === 1) {
      return 'Photo';
    }
    if (hasImage) {
      return `${attachments.length} attachments`;
    }
    return attachments.length === 1 ? 'File' : `${attachments.length} files`;
  })();

  const handlePickImage = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant photo library access to send images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      await uploadAttachment({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || getFilenameFromUrl(asset.uri) || 'image.jpg',
        isImage: true,
      });
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Could not upload image. Please try again.');
    }
  }, [uploadAttachment]);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      await uploadAttachment({
        uri: asset.uri,
        mimeType: asset.mimeType || 'application/octet-stream',
        fileName: asset.name || getFilenameFromUrl(asset.uri) || 'file',
        isImage: isImageUrl(asset.uri) || (asset.mimeType || '').startsWith('image/'),
      });
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Could not upload file. Please try again.');
    }
  }, [uploadAttachment]);

  const handleRemoveAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setSelection(event.nativeEvent.selection);
    },
    [],
  );

  const handleSelectEmoji = useCallback(
    (emoji: string) => {
      setText((prev) => {
        const start = selection.start ?? prev.length;
        const end = selection.end ?? prev.length;
        const next = prev.slice(0, start) + emoji + prev.slice(end);
        const nextCursor = start + emoji.length;
        setSelection({ start: nextCursor, end: nextCursor });
        return next;
      });
    },
    [selection.end, selection.start],
  );

  const handlePickGif = useCallback(async () => {
    if (!HAS_GIPHY_API_KEY) {
      Alert.alert('GIPHY is not configured', 'Please set EXPO_PUBLIC_GIPHY_API_KEY in your environment.');
      return;
    }

    try {
      const gifAttachment = await pickGifAttachment();
      if (!gifAttachment) {
        Alert.alert(
          'GIPHY not available',
          'This build does not include the GIPHY native module. Please run a dev build with expo run:android / expo run:ios.',
        );
        return;
      }

      const id = gifAttachment.id || `gif-${Date.now()}`;
      setPendingAttachments((prev) => [
        ...prev,
        {
          id,
          uri: gifAttachment.url,
          fileName: gifAttachment.filename || getFilenameFromUrl(gifAttachment.url) || 'giphy.gif',
          mimeType: gifAttachment.contentType || 'image/gif',
          isImage: true,
          isUploading: false,
          attachment: gifAttachment,
        },
      ]);
    } catch (err: any) {
      Alert.alert('GIF picker failed', err?.message || 'Could not select GIF. Please try again.');
    }
  }, []);

  return (
    <View>
      {replyToMessage && (
        <View style={styles.replyContainer}>
          <View style={styles.replyIndicator} />
          <View style={styles.replyTextContainer}>
            <ThemedText style={styles.replyLabel}>Replying to {replyAuthor}</ThemedText>
            <ThemedText numberOfLines={1} style={styles.replyText}>{replySummary}</ThemedText>
          </View>
          <TouchableOpacity style={styles.replyCloseBtn} onPress={onCancelReply} activeOpacity={0.7}>
            <Ionicons name="close" size={16} color={DiscordColors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Attachment preview */}
      {pendingAttachments.length > 0 && (
        <AttachmentPreview
          items={pendingAttachments.map((item) => ({
            id: item.id,
            uri: item.uri,
            fileName: item.fileName,
            isImage: item.isImage,
            isUploading: item.isUploading,
          }))}
          onRemove={handleRemoveAttachment}
        />
      )}

      <View style={styles.container}>
        {/* Attachment button */}
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.6}
          onPress={handlePickImage}
          disabled={disabled}
        >
          <Ionicons
            name="image-outline"
            size={22}
            color={DiscordColors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.6}
          onPress={handlePickFile}
          disabled={disabled}
        >
          <Ionicons
            name="document-attach-outline"
            size={22}
            color={DiscordColors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gifBtn}
          activeOpacity={0.7}
          onPress={handlePickGif}
          disabled={disabled}
        >
          <ThemedText style={styles.gifBtnText}>GIF</ThemedText>
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          {/* Text input */}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            onSelectionChange={handleSelectionChange}
            selection={selection}
            placeholder={placeholder}
            placeholderTextColor={DiscordColors.textMuted}
            multiline
            maxLength={2000}
            editable={!disabled}
            returnKeyType="default"
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={styles.inputEmojiBtn}
            activeOpacity={0.7}
            onPress={() => setEmojiPickerVisible(true)}
            disabled={disabled}
          >
            <Ionicons name="happy-outline" size={20} color={DiscordColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Send button */}
        <TouchableOpacity
          style={[styles.sendBtn, canSend && styles.sendBtnActive]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Ionicons
            name="send"
            size={20}
            color={canSend ? '#FFFFFF' : DiscordColors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <EmojiPicker
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onSelectEmoji={handleSelectEmoji}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: DiscordColors.primaryBackground,
    borderTopWidth: 1,
    borderTopColor: DiscordColors.divider,
  },
  iconBtn: {
    padding: Spacing.xs,
    marginBottom: 4,
  },
  gifBtn: {
    minWidth: 34,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: DiscordColors.inputBackground,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    paddingHorizontal: 6,
  },
  gifBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: DiscordColors.textMuted,
    letterSpacing: 0.4,
  },
  input: {
    flex: 1,
    paddingLeft: Spacing.md,
    paddingRight: 36,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: DiscordColors.textPrimary,
    maxHeight: 120,
    lineHeight: 20,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 20,
    marginHorizontal: Spacing.xs,
    minHeight: 40,
    justifyContent: 'center',
  },
  inputEmojiBtn: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  sendBtnActive: {
    backgroundColor: DiscordColors.blurple,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 6,
    backgroundColor: DiscordColors.primaryBackground,
    borderTopWidth: 1,
    borderTopColor: DiscordColors.divider,
  },
  replyIndicator: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: DiscordColors.blurple,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  replyTextContainer: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DiscordColors.blurple,
  },
  replyText: {
    marginTop: 1,
    fontSize: 12,
    color: DiscordColors.textSecondary,
  },
  replyCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
});
