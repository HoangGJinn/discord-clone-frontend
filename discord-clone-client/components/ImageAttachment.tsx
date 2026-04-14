import React, { memo, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DiscordColors, Spacing } from '@/constants/theme';
import { Attachment } from '@/types/dm';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_IMAGE_WIDTH = SCREEN_WIDTH * 0.65;

// ─── Props ───────────────────────────────────────────────────
interface ImageAttachmentProps {
  attachments: Attachment[];
}

// ─── Component ───────────────────────────────────────────────
function ImageAttachmentInner({ attachments }: ImageAttachmentProps) {
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const imageAttachments = attachments.filter((att) =>
    att.contentType?.startsWith('image/'),
  );

  if (imageAttachments.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        {imageAttachments.map((att) => (
          <TouchableOpacity
            key={att.id}
            style={styles.imageWrapper}
            onPress={() => setViewingImage(att.url)}
            activeOpacity={0.85}
          >
            {loadingStates[att.id] && (
              <View style={styles.loadingSkeleton}>
                <ActivityIndicator color={DiscordColors.blurple} />
              </View>
            )}
            <Image
              source={{ uri: att.url }}
              style={styles.image}
              resizeMode="cover"
              onLoadStart={() =>
                setLoadingStates((s) => ({ ...s, [att.id]: true }))
              }
              onLoadEnd={() =>
                setLoadingStates((s) => ({ ...s, [att.id]: false }))
              }
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Full-screen image viewer */}
      <Modal
        visible={!!viewingImage}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setViewingImage(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {viewingImage && (
            <Image
              source={{ uri: viewingImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}

export const ImageAttachment = memo(ImageAttachmentInner);

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    gap: 6,
  },
  imageWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: MAX_IMAGE_WIDTH,
  },
  image: {
    width: MAX_IMAGE_WIDTH,
    height: MAX_IMAGE_WIDTH * 0.6,
    borderRadius: 8,
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  loadingSkeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 8,
    zIndex: 1,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
