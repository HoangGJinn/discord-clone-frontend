import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { regenerateInviteCode, ServerDetailsResponse } from '@/services/serverService';
import { copyToClipboard } from '@/utils/clipboard';

// ── Props ───────────────────────────────────────────────────────────────────

interface InviteModalProps {
  /** Controls modal visibility. */
  visible: boolean;
  /** Current server details (provides inviteCode & name). */
  serverDetails: ServerDetailsResponse | null;
  /** Whether the current user has admin/owner role. */
  isManager: boolean;
  /** Called when the modal is dismissed. */
  onClose: () => void;
  /** Called after an invite code is regenerated so parent can update state. */
  onInviteCodeChanged: (newCode: string) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function InviteModal({
  visible,
  serverDetails,
  isManager,
  onClose,
  onInviteCodeChanged,
}: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const inviteCode = serverDetails?.inviteCode ?? '';
  const serverName = serverDetails?.name ?? 'Server';

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (!inviteCode) return;

    const success = await copyToClipboard(inviteCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteCode]);

  const handleRegenerate = useCallback(() => {
    if (!serverDetails?.id) return;

    Alert.alert(
      'Regenerate Invite Code',
      'The current invite code will stop working. Anyone with the old code won\'t be able to join. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setIsRegenerating(true);
            try {
              const newCode = await regenerateInviteCode(serverDetails.id);
              onInviteCodeChanged(newCode);
            } catch {
              Alert.alert('Error', 'Failed to regenerate invite code.');
            } finally {
              setIsRegenerating(false);
            }
          },
        },
      ],
    );
  }, [serverDetails?.id, onInviteCodeChanged]);

  const handleClose = useCallback(() => {
    setCopied(false);
    onClose();
  }, [onClose]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="person-add" size={20} color={DiscordColors.blurple} />
              <ThemedText style={styles.title}>Invite Friends</ThemedText>
            </View>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={DiscordColors.textSecondary} />
            </Pressable>
          </View>

          {/* Server name badge */}
          <View style={styles.serverBadge}>
            <Ionicons name="server-outline" size={16} color={DiscordColors.textMuted} />
            <ThemedText style={styles.serverBadgeText} numberOfLines={1}>
              {serverName}
            </ThemedText>
          </View>

          {/* Description */}
          <ThemedText style={styles.description}>
            Share this invite code with friends so they can join your server.
          </ThemedText>

          {/* Invite Code Display */}
          <View style={styles.codeContainer}>
            <ThemedText style={styles.codeLabel}>INVITE CODE</ThemedText>
            <View style={styles.codeRow}>
              <View style={styles.codeBox}>
                <ThemedText style={styles.codeText} selectable>
                  {inviteCode || '—'}
                </ThemedText>
              </View>
              <Pressable
                style={[styles.copyButton, copied && styles.copyButtonSuccess]}
                onPress={handleCopy}
                disabled={!inviteCode}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={18}
                  color="#fff"
                />
                <ThemedText style={styles.copyText}>
                  {copied ? 'Copied!' : 'Copy'}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Regenerate button — only for admins/owners */}
          {isManager ? (
            <Pressable
              style={styles.regenerateButton}
              onPress={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <ActivityIndicator size="small" color={DiscordColors.textSecondary} />
              ) : (
                <Ionicons name="refresh" size={16} color={DiscordColors.textSecondary} />
              )}
              <ThemedText style={styles.regenerateText}>
                {isRegenerating ? 'Regenerating...' : 'Generate New Code'}
              </ThemedText>
            </Pressable>
          ) : null}

          {/* Hint */}
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={14} color={DiscordColors.textMuted} />
            <ThemedText style={styles.hintText}>
              Your invite code never expires, unless it's regenerated by an admin.
            </ThemedText>
          </View>
        </View>
      </View>
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
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serverBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: DiscordColors.textSecondary,
    maxWidth: 200,
  },
  description: {
    fontSize: 14,
    color: DiscordColors.textSecondary,
    lineHeight: 20,
  },
  codeContainer: {
    gap: 6,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: DiscordColors.textMuted,
    letterSpacing: 0.8,
  },
  codeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  codeBox: {
    flex: 1,
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DiscordColors.divider,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: DiscordColors.textPrimary,
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: DiscordColors.blurple,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    minWidth: 92,
  },
  copyButtonSuccess: {
    backgroundColor: DiscordColors.green,
  },
  copyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
  },
  regenerateText: {
    color: DiscordColors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingBottom: Spacing.sm,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: DiscordColors.textMuted,
    lineHeight: 16,
  },
});
