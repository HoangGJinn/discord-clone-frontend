import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, { SlideInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';

// ─── Props ───────────────────────────────────────────────────
interface EditMessageInputProps {
  originalContent: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

// ─── Component ───────────────────────────────────────────────
export function EditMessageInput({
  originalContent,
  onSave,
  onCancel,
}: EditMessageInputProps) {
  const [text, setText] = useState(originalContent);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus the input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const canSave = text.trim().length > 0 && text.trim() !== originalContent.trim();

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === originalContent.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave(trimmed);
  }, [text, originalContent, onSave]);

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
    >
      {/* Editing banner */}
      <View style={styles.banner}>
        <Ionicons name="pencil" size={14} color={DiscordColors.blurple} />
        <ThemedText style={styles.bannerText}>Editing message</ThemedText>
        <TouchableOpacity onPress={onCancel} style={styles.bannerClose}>
          <Ionicons name="close" size={16} color={DiscordColors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          placeholder="Edit your message..."
          placeholderTextColor={DiscordColors.textMuted}
          returnKeyType="default"
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, canSave && styles.saveBtnActive]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.7}
          >
            <Ionicons
              name="checkmark"
              size={20}
              color={canSave ? '#FFFFFF' : DiscordColors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: DiscordColors.primaryBackground,
    borderTopWidth: 1,
    borderTopColor: DiscordColors.divider,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: DiscordColors.secondaryBackground,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: DiscordColors.blurple,
    marginLeft: 6,
    flex: 1,
  },
  bannerClose: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: DiscordColors.textPrimary,
    maxHeight: 120,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: DiscordColors.textMuted,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  saveBtnActive: {
    backgroundColor: DiscordColors.green,
  },
});
