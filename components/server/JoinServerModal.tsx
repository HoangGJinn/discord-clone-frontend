import React, { useCallback, useState } from 'react';
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
import { useServerStore } from '@/store/useServerStore';

// ── Constants ───────────────────────────────────────────────────────────────

const AUTO_CLOSE_DELAY_MS = 1200;

// ── Props ───────────────────────────────────────────────────────────────────

interface JoinServerModalProps {
  /** Controls modal visibility. */
  visible: boolean;
  /** Called when the modal is dismissed. */
  onClose: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function JoinServerModal({ visible, onClose }: JoinServerModalProps) {
  const joinServerByCode = useServerStore((state) => state.joinServerByCode);
  const isJoining = useServerStore((state) => state.isJoiningServer);

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = inviteCode.trim().length > 0 && !isJoining;

  // ── Helpers ─────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setInviteCode('');
    setError(null);
    setSuccess(null);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (isJoining) return;
    resetForm();
    onClose();
  }, [isJoining, resetForm, onClose]);

  const handleInputChange = useCallback((text: string) => {
    setInviteCode(text);
    setError(null);
    setSuccess(null);
  }, []);

  const handleJoin = useCallback(async () => {
    const trimmed = inviteCode.trim();
    if (!trimmed) {
      setError('Please enter an invite code.');
      return;
    }

    setError(null);
    setSuccess(null);

    const joined = await joinServerByCode(trimmed);
    if (joined) {
      setSuccess(`Successfully joined "${joined.name}"!`);
      setTimeout(() => {
        resetForm();
        onClose();
      }, AUTO_CLOSE_DELAY_MS);
    } else {
      setError('Failed to join server. Please check the invite code and try again.');
    }
  }, [inviteCode, joinServerByCode, resetForm, onClose]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="enter-outline" size={20} color={DiscordColors.green} />
              <ThemedText style={styles.title}>Join a Server</ThemedText>
            </View>
            <Pressable onPress={handleClose} hitSlop={8} disabled={isJoining}>
              <Ionicons name="close" size={24} color={DiscordColors.textSecondary} />
            </Pressable>
          </View>

          {/* Description */}
          <ThemedText style={styles.description}>
            Enter an invite code below to join an existing server.
          </ThemedText>

          {/* Invite Code Input */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>INVITE CODE *</ThemedText>
            <View style={styles.inputRow}>
              <Ionicons name="key-outline" size={18} color={DiscordColors.textMuted} />
              <TextInput
                value={inviteCode}
                onChangeText={handleInputChange}
                editable={!isJoining}
                placeholder="Enter invite code"
                placeholderTextColor={DiscordColors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleJoin}
              />
            </View>
          </View>

          {/* Error message */}
          {error ? (
            <View style={styles.messageRow}>
              <Ionicons name="alert-circle" size={14} color={DiscordColors.red} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          {/* Success message */}
          {success ? (
            <View style={styles.messageRow}>
              <Ionicons name="checkmark-circle" size={14} color={DiscordColors.green} />
              <ThemedText style={styles.successText}>{success}</ThemedText>
            </View>
          ) : null}

          {/* Hint */}
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={14} color={DiscordColors.textMuted} />
            <ThemedText style={styles.hintText}>
              Ask a server member or admin for their invite code.
            </ThemedText>
          </View>

          {/* Actions */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleClose}
              disabled={isJoining}
            >
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.actionButton,
                styles.joinButton,
                !canSubmit && styles.disabledButton,
              ]}
              onPress={handleJoin}
              disabled={!canSubmit}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="enter-outline" size={16} color="#fff" />
                  <ThemedText style={styles.joinText}>Join Server</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: DiscordColors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: DiscordColors.textSecondary,
    lineHeight: 20,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: DiscordColors.textMuted,
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    color: DiscordColors.textPrimary,
    fontSize: 16,
    paddingVertical: 12,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    color: DiscordColors.red,
    fontSize: 13,
    flex: 1,
  },
  successText: {
    color: DiscordColors.green,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: DiscordColors.textMuted,
    lineHeight: 16,
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
    flexDirection: 'row',
    gap: 6,
  },
  cancelButton: {
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  joinButton: {
    backgroundColor: DiscordColors.green,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelText: {
    color: DiscordColors.textPrimary,
    fontWeight: '700',
  },
  joinText: {
    color: '#fff',
    fontWeight: '700',
  },
});
