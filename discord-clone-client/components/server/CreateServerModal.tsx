import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { DiscordColors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { uploadFile } from '@/services/serverService';
import { useServerStore } from '@/store/useServerStore';

interface CreateServerModalProps {
  visible: boolean;
  onClose: () => void;
}

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return 'SV';
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};

export function CreateServerModal({ visible, onClose }: CreateServerModalProps) {
  const createNewServer = useServerStore((state) => state.createNewServer);
  const isCreatingServer = useServerStore((state) => state.isCreatingServer);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState<string | undefined>(undefined);
  const [localPreviewUri, setLocalPreviewUri] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = isCreatingServer || isUploading;
  const canSubmit = name.trim().length >= 2 && !isBusy;

  const previewSource = useMemo(() => localPreviewUri || iconUrl, [localPreviewUri, iconUrl]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setIconUrl(undefined);
    setLocalPreviewUri(undefined);
    setError(null);
  };

  const handleClose = () => {
    if (isBusy) return;
    resetForm();
    onClose();
  };

  const handlePickIcon = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow photo access to upload a server icon.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setLocalPreviewUri(asset.uri);
      setIsUploading(true);
      setError(null);

      const uploadedUrl = await uploadFile({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });

      setIconUrl(uploadedUrl);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : 'Failed to upload server icon.';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Server name must be at least 2 characters.');
      return;
    }

    setError(null);

    const created = await createNewServer({
      name: trimmedName,
      description: description.trim() || undefined,
      iconUrl,
    });

    if (!created) {
      return;
    }

    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Create Server</ThemedText>
            <Pressable onPress={handleClose} hitSlop={8} disabled={isBusy}>
              <Ionicons name="close" size={24} color={DiscordColors.textSecondary} />
            </Pressable>
          </View>

          <Pressable style={styles.iconPicker} onPress={handlePickIcon} disabled={isBusy}>
            {previewSource ? (
              <Image source={{ uri: previewSource }} style={styles.iconPreview} />
            ) : (
              <View style={styles.iconPlaceholder}>
                <ThemedText style={styles.iconInitials}>{getInitials(name)}</ThemedText>
              </View>
            )}
            <View style={styles.iconHintRow}>
              <Ionicons name="camera" size={14} color={DiscordColors.textSecondary} />
              <ThemedText style={styles.iconHint}>
                {isUploading ? 'Uploading icon...' : 'Upload server icon'}
              </ThemedText>
            </View>
          </Pressable>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Server Name *</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              editable={!isBusy}
              placeholder="My server"
              placeholderTextColor={DiscordColors.textMuted}
              style={styles.input}
              maxLength={100}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              editable={!isBusy}
              placeholder="What is this server about?"
              placeholderTextColor={DiscordColors.textMuted}
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          <View style={styles.footer}>
            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleClose}
              disabled={isBusy}
            >
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.createButton, !canSubmit && styles.disabledButton]}
              onPress={handleCreate}
              disabled={!canSubmit}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.createText}>Create</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheet: {
    backgroundColor: DiscordColors.secondaryBackground,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: DiscordColors.textPrimary,
  },
  iconPicker: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  iconPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: DiscordColors.blurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPreview: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  iconInitials: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  iconHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconHint: {
    fontSize: 12,
    color: DiscordColors.textSecondary,
  },
  formGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 12,
    color: DiscordColors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: DiscordColors.textPrimary,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: DiscordColors.red,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  createButton: {
    backgroundColor: DiscordColors.blurple,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelText: {
    color: DiscordColors.textPrimary,
    fontWeight: '700',
  },
  createText: {
    color: '#fff',
    fontWeight: '700',
  },
});

