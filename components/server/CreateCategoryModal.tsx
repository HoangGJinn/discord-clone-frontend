import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import {
  CategoryResponse,
  createCategory,
  updateCategory,
} from '@/services/serverService';

interface CreateCategoryModalProps {
  visible: boolean;
  serverId: number | null;
  editingCategory?: CategoryResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

const normalizeError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    if (maybeError.response?.data?.message) return String(maybeError.response.data.message);
    if (maybeError.message) return String(maybeError.message);
  }
  return 'Could not save category.';
};

export function CreateCategoryModal({
  visible,
  serverId,
  editingCategory,
  onClose,
  onSuccess,
}: CreateCategoryModalProps) {
  const isEditing = useMemo(() => Boolean(editingCategory), [editingCategory]);

  const [name, setName] = useState('');
  const [position, setPosition] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    setName(editingCategory?.name || '');
    setPosition(String(editingCategory?.position ?? 0));
    setError(null);
  }, [visible, editingCategory]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const parsedPosition = Number(position);

    if (!trimmedName) {
      setError('Category name is required.');
      return;
    }

    if (!Number.isFinite(parsedPosition)) {
      setError('Position must be a valid number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isEditing && editingCategory) {
        await updateCategory(editingCategory.id, {
          name: trimmedName,
          position: parsedPosition,
        });
      } else {
        if (!serverId) {
          setError('Please select a server first.');
          return;
        }

        await createCategory(serverId, {
          name: trimmedName,
          position: parsedPosition,
        });
      }

      onSuccess();
      onClose();
    } catch (submitError) {
      setError(normalizeError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.iconButton}>
              <Ionicons name="close" size={22} color={DiscordColors.textSecondary} />
            </Pressable>
            <ThemedText style={styles.title}>
              {isEditing ? 'Edit Category' : 'Create Category'}
            </ThemedText>
            <View style={styles.iconButton} />
          </View>

          <View style={styles.body}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={DiscordColors.red} />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            ) : null}

            <ThemedText style={styles.label}>NAME</ThemedText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="GENERAL"
              placeholderTextColor={DiscordColors.textMuted}
              maxLength={100}
              autoFocus
            />

            <ThemedText style={styles.label}>POSITION</ThemedText>
            <TextInput
              style={styles.input}
              value={position}
              onChangeText={setPosition}
              placeholder="0"
              placeholderTextColor={DiscordColors.textMuted}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={[styles.actionButton, styles.secondaryButton]}>
              <ThemedText style={styles.secondaryText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              style={[styles.actionButton, styles.primaryButton, isSubmitting && styles.disabledButton]}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.primaryText}>{isEditing ? 'Save' : 'Create'}</ThemedText>
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
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  container: {
    backgroundColor: DiscordColors.secondaryBackground,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DiscordColors.divider,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: DiscordColors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  label: {
    color: DiscordColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    color: DiscordColors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontSize: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(242, 63, 67, 0.14)',
    borderColor: 'rgba(242, 63, 67, 0.4)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    color: DiscordColors.textPrimary,
    fontSize: 13,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryButton: {
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  primaryButton: {
    backgroundColor: DiscordColors.blurple,
  },
  disabledButton: {
    opacity: 0.7,
  },
  secondaryText: {
    color: DiscordColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
