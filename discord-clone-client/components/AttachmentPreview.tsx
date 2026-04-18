import React, { memo } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInDown, FadeOut } from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';

// ─── Props ───────────────────────────────────────────────────
interface AttachmentPreviewProps {
  uri: string;
  isUploading: boolean;
  onRemove: () => void;
}

// ─── Component ───────────────────────────────────────────────
function AttachmentPreviewInner({
  uri,
  isUploading,
  onRemove,
}: AttachmentPreviewProps) {
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
    >
      <View style={styles.preview}>
        <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" />

        {isUploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <ThemedText style={styles.uploadText}>Uploading...</ThemedText>
          </View>
        )}

        {!isUploading && (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={onRemove}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={22} color={DiscordColors.red} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

export const AttachmentPreview = memo(AttachmentPreviewInner);

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    backgroundColor: DiscordColors.primaryBackground,
    borderTopWidth: 1,
    borderTopColor: DiscordColors.divider,
  },
  preview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  uploadText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: DiscordColors.secondaryBackground,
    borderRadius: 11,
  },
});
