import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import {
  CategoryResponse,
  ChannelResponse,
  createChannel,
  updateChannel,
} from '@/services/serverService';

interface CreateChannelModalProps {
  visible: boolean;
  serverId: number | null;
  categories: CategoryResponse[];
  defaultCategoryId?: number | null;
  editingChannel?: ChannelResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

type ChannelType = 'TEXT' | 'VOICE';

const normalizeError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    if (maybeError.response?.data?.message) return String(maybeError.response.data.message);
    if (maybeError.message) return String(maybeError.message);
  }
  return 'Could not save channel.';
};

export function CreateChannelModal({
  visible,
  serverId,
  categories,
  defaultCategoryId,
  editingChannel,
  onClose,
  onSuccess,
}: CreateChannelModalProps) {
  const isEditing = useMemo(() => Boolean(editingChannel), [editingChannel]);

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [channelType, setChannelType] = useState<ChannelType>('TEXT');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [bitrate, setBitrate] = useState('64000');
  const [userLimit, setUserLimit] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    if (editingChannel) {
      setName(editingChannel.name || '');
      setTopic(editingChannel.topic || '');
      setChannelType(editingChannel.type || 'TEXT');
      setSelectedCategoryId(editingChannel.categoryId ?? null);
      setBitrate(String(editingChannel.bitrate ?? 64000));
      setUserLimit(String(editingChannel.userLimit ?? 0));
    } else {
      setName('');
      setTopic('');
      setChannelType('TEXT');
      setSelectedCategoryId(defaultCategoryId ?? null);
      setBitrate('64000');
      setUserLimit('0');
    }

    setError(null);
  }, [visible, editingChannel, defaultCategoryId]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Channel name is required.');
      return;
    }

    const parsedBitrate = Number(bitrate);
    const parsedUserLimit = Number(userLimit);

    if (channelType === 'VOICE') {
      if (!Number.isFinite(parsedBitrate) || parsedBitrate < 8000 || parsedBitrate > 384000) {
        setError('Voice bitrate must be between 8000 and 384000.');
        return;
      }
      if (!Number.isFinite(parsedUserLimit) || parsedUserLimit < 0) {
        setError('User limit must be zero or a positive number.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isEditing && editingChannel) {
        await updateChannel(editingChannel.id, {
          name: trimmedName,
          topic: channelType === 'TEXT' ? topic.trim() || undefined : undefined,
          categoryId: selectedCategoryId,
          bitrate: channelType === 'VOICE' ? parsedBitrate : undefined,
          userLimit: channelType === 'VOICE' ? parsedUserLimit : undefined,
        });
      } else {
        if (!serverId) {
          setError('Please select a server first.');
          return;
        }

        await createChannel(serverId, {
          name: trimmedName,
          type: channelType,
          topic: channelType === 'TEXT' ? topic.trim() || undefined : undefined,
          categoryId: selectedCategoryId,
          bitrate: channelType === 'VOICE' ? parsedBitrate : undefined,
          userLimit: channelType === 'VOICE' ? parsedUserLimit : undefined,
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
            <ThemedText style={styles.title}>{isEditing ? 'Edit Channel' : 'Create Channel'}</ThemedText>
            <View style={styles.iconButton} />
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={DiscordColors.red} />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            ) : null}

            {!isEditing ? (
              <View style={styles.section}>
                <ThemedText style={styles.label}>CHANNEL TYPE</ThemedText>
                <View style={styles.optionGroup}>
                  <Pressable
                    onPress={() => setChannelType('TEXT')}
                    style={[styles.optionRow, channelType === 'TEXT' && styles.optionRowActive]}
                  >
                    <ThemedText style={styles.optionIcon}>#</ThemedText>
                    <ThemedText style={styles.optionLabel}>Text Channel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setChannelType('VOICE')}
                    style={[styles.optionRow, channelType === 'VOICE' && styles.optionRowActive]}
                  >
                    <Ionicons name="volume-high-outline" size={16} color={DiscordColors.textSecondary} />
                    <ThemedText style={styles.optionLabel}>Voice Channel</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <ThemedText style={styles.label}>NAME</ThemedText>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(value) => setName(value.replace(/\s+/g, '-').toLowerCase())}
                placeholder="general"
                placeholderTextColor={DiscordColors.textMuted}
                maxLength={100}
              />
            </View>

            {channelType === 'TEXT' ? (
              <View style={styles.section}>
                <ThemedText style={styles.label}>TOPIC</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="What is this channel about?"
                  placeholderTextColor={DiscordColors.textMuted}
                  multiline
                  numberOfLines={3}
                  maxLength={1024}
                />
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <ThemedText style={styles.label}>BITRATE</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={bitrate}
                    onChangeText={setBitrate}
                    placeholder="64000"
                    placeholderTextColor={DiscordColors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.section}>
                  <ThemedText style={styles.label}>USER LIMIT</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={userLimit}
                    onChangeText={setUserLimit}
                    placeholder="0"
                    placeholderTextColor={DiscordColors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            <View style={styles.section}>
              <ThemedText style={styles.label}>CATEGORY</ThemedText>
              <View style={styles.optionGroup}>
                <Pressable
                  onPress={() => setSelectedCategoryId(null)}
                  style={[styles.optionRow, selectedCategoryId === null && styles.optionRowActive]}
                >
                  <Ionicons name="folder-open-outline" size={16} color={DiscordColors.textSecondary} />
                  <ThemedText style={styles.optionLabel}>No Category</ThemedText>
                </Pressable>
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => setSelectedCategoryId(category.id)}
                    style={[styles.optionRow, selectedCategoryId === category.id && styles.optionRowActive]}
                  >
                    <Ionicons name="folder-outline" size={16} color={DiscordColors.textSecondary} />
                    <ThemedText style={styles.optionLabel}>{category.name}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

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
    maxHeight: '90%',
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
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  section: {
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
  textArea: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  optionGroup: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  optionRowActive: {
    borderColor: DiscordColors.blurple,
    backgroundColor: 'rgba(88, 101, 242, 0.16)',
  },
  optionIcon: {
    color: DiscordColors.textSecondary,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 18,
  },
  optionLabel: {
    color: DiscordColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
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
