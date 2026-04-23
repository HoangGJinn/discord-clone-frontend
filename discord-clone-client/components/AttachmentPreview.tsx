import React, { memo } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';

// ─── Props ───────────────────────────────────────────────────
interface AttachmentPreviewProps {
  items: {
    id: string;
    uri: string;
    fileName: string;
    isImage: boolean;
    isUploading: boolean;
  }[];
  onRemove: (id: string) => void;
}

// ─── Component ───────────────────────────────────────────────
function AttachmentPreviewInner({
  items,
  onRemove,
}: AttachmentPreviewProps) {
  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => (
          <View key={item.id} style={styles.preview}>
            {item.isImage ? (
              <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.fileThumb}>
                <Ionicons name="document-outline" size={26} color={DiscordColors.textSecondary} />
              </View>
            )}

            {item.isUploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <ThemedText style={styles.uploadText}>Uploading...</ThemedText>
              </View>
            )}

            <ThemedText numberOfLines={1} style={styles.fileName}>
              {item.fileName}
            </ThemedText>

            {!item.isUploading && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onRemove(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={22} color={DiscordColors.red} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
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
    height: 102,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginRight: Spacing.sm,
  },
  thumbnail: {
    width: '100%',
    height: 80,
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  fileThumb: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    paddingBottom: 2,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
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
  fileName: {
    marginTop: 4,
    height: 14,
    fontSize: 11,
    lineHeight: 14,
    color: DiscordColors.textMuted,
  },
});
