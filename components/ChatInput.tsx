import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { DiscordColors, Spacing } from '@/constants/theme';

// ─── Props Interface ─────────────────────────────────────────
interface ChatInputProps {
  /** Called when the user submits a message */
  onSend: (content: string) => void;
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

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed);
    setText('');
  }, [text, onSend]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        {/* Attachment button */}
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.6}>
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
    </KeyboardAvoidingView>
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
