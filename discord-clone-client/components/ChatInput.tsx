import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AttachmentPreview } from './AttachmentPreview';
import { DiscordColors, Spacing } from '@/constants/theme';
import apiClient from '@/api/client';

// ─── Props Interface ─────────────────────────────────────────
interface ChatInputProps {
  /** Called when the user submits a message */
  onSend: (content: string, attachmentUrls?: string[]) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Disables the input while sending */
  disabled?: boolean;
}

// ─── Component (SRP: Only handles text input and send action) ─
export function ChatInput({
  onSend,
  placeholder = 'Send a message...',
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const canSend = (text.trim().length > 0 || attachmentUrl) && !disabled && !isUploading;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !attachmentUrl) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const urls = attachmentUrl ? [attachmentUrl] : undefined;
    onSend(trimmed || ' ', urls);
    setText('');
    setPendingAttachment(null);
    setAttachmentUrl(null);
  }, [text, attachmentUrl, onSend]);

  const handlePickImage = useCallback(async () => {
    try {
      // Request permission
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
      setPendingAttachment(asset.uri);
      setIsUploading(true);

      // Upload to server
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || 'image.jpg',
      } as any);

      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAttachmentUrl(response.data.url || response.data);
      setIsUploading(false);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
      setPendingAttachment(null);
      setAttachmentUrl(null);
      setIsUploading(false);
    }
  }, []);

  const handleRemoveAttachment = useCallback(() => {
    setPendingAttachment(null);
    setAttachmentUrl(null);
    setIsUploading(false);
  }, []);

  return (
    <View>
      {/* Attachment preview */}
      {pendingAttachment && (
        <AttachmentPreview
          uri={pendingAttachment}
          isUploading={isUploading}
          onRemove={handleRemoveAttachment}
        />
      )}

      <View style={styles.container}>
        {/* Attachment button */}
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.6}
          onPress={handlePickImage}
        >
          <Ionicons
            name="add-circle"
            size={26}
            color={DiscordColors.textMuted}
          />
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={DiscordColors.textMuted}
          multiline
          maxLength={2000}
          editable={!disabled}
          returnKeyType="default"
          blurOnSubmit={false}
        />

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
  input: {
    flex: 1,
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginHorizontal: Spacing.xs,
    fontSize: 15,
    color: DiscordColors.textPrimary,
    maxHeight: 120,
    lineHeight: 20,
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
});
