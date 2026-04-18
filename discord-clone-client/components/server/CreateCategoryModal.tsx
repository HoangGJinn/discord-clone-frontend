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
  categories: CategoryResponse[];
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
  categories,
  editingCategory,
  onClose,
  onSuccess,
}: CreateCategoryModalProps) {
  const isEditing = useMemo(() => Boolean(editingCategory), [editingCategory]);

  const [name, setName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [positionMenuOpen, setPositionMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((left, right) => {
        const byPosition = (left.position ?? 0) - (right.position ?? 0);
        if (byPosition !== 0) return byPosition;
        return left.id - right.id;
      }),
    [categories],
  );

  const editingSlot = useMemo(() => {
    if (!editingCategory) return null;
    const index = sortedCategories.findIndex((category) => category.id === editingCategory.id);
    return index >= 0 ? index : null;
  }, [editingCategory, sortedCategories]);

  useEffect(() => {
    if (!visible) return;

    setName(editingCategory?.name || '');
    setSelectedSlot(editingSlot);
    setPositionMenuOpen(false);
    setError(null);
  }, [visible, editingCategory, editingSlot]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isEditing && editingCategory) {
        if (selectedSlot === null || selectedSlot < 0 || selectedSlot >= sortedCategories.length) {
          setError('Please choose a valid position.');
          return;
        }

        const targetCategory = sortedCategories[selectedSlot];
        const currentCategory = sortedCategories.find((category) => category.id === editingCategory.id);

        if (!targetCategory || !currentCategory) {
          setError('Could not resolve category positions. Please try again.');
          return;
        }

        const nextPosition = targetCategory.position ?? selectedSlot;
        const currentPosition = currentCategory.position ?? editingCategory.position;
        const needsSwap = targetCategory.id !== editingCategory.id && nextPosition !== currentPosition;

        if (needsSwap) {
          await updateCategory(targetCategory.id, {
            position: currentPosition,
          });
        }

        await updateCategory(editingCategory.id, {
          name: trimmedName,
          position: nextPosition,
        });
      } else {
        if (!serverId) {
          setError('Please select a server first.');
          return;
        }

        await createCategory(serverId, {
          name: trimmedName,
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

            {isEditing ? (
              <>
                <ThemedText style={styles.label}>POSITION</ThemedText>
                <Pressable
                  style={styles.selectInput}
                  onPress={() => setPositionMenuOpen((current) => !current)}
                >
                  <ThemedText style={styles.selectInputText}>
                    {selectedSlot === null
                      ? 'Choose position'
                      : `Position ${selectedSlot + 1}`}
                  </ThemedText>
                  <Ionicons
                    name={positionMenuOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={DiscordColors.textMuted}
                  />
                </Pressable>

                {positionMenuOpen ? (
                  <View style={styles.dropdownMenu}>
                    {sortedCategories.map((category, index) => {
                      const isCurrentCategory = category.id === editingCategory?.id;
                      const isSelected = selectedSlot === index;

                      return (
                        <Pressable
                          key={category.id}
                          style={[
                            styles.dropdownOption,
                            isSelected && styles.dropdownOptionActive,
                          ]}
                          onPress={() => {
                            setSelectedSlot(index);
                            setPositionMenuOpen(false);
                          }}
                        >
                          <ThemedText style={styles.dropdownOptionText}>
                            {`Position ${index + 1}`}
                            {isCurrentCategory
                              ? ' (current)'
                              : ` - swap with ${category.name}`}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </>
            ) : null}
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
  selectInput: {
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    color: DiscordColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownMenu: {
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  dropdownOptionActive: {
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  dropdownOptionText: {
    color: DiscordColors.textPrimary,
    fontSize: 13,
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
