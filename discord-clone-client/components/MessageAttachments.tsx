import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  NativeModules,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { Attachment } from '@/types/dm';
import {
  ensureFilenameExtension,
  getFilenameFromUrl,
  getMimeTypeFromNameOrUrl,
  isImageAttachment,
} from '@/utils/attachments';



type DownloadToDownloadsModule = {
  saveToDownloads: (url: string, fileName: string, mimeType?: string) => Promise<string>;
};

const { DownloadToDownloads } = NativeModules as {
  DownloadToDownloads?: DownloadToDownloadsModule;
};

interface MessageAttachmentsProps {
  attachments: Attachment[];
}

function MessageAttachmentsInner({ attachments }: MessageAttachmentsProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const imageAttachments = useMemo(
    () => attachments.filter((item) => isImageAttachment(item)),
    [attachments],
  );

  const fileAttachments = useMemo(
    () => attachments.filter((item) => !isImageAttachment(item)),
    [attachments],
  );

  const buildFileMeta = useCallback((url: string, filename?: string, contentType?: string) => {
    const baseName = (filename || getFilenameFromUrl(url) || 'download')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const resolvedFileName = ensureFilenameExtension(
      baseName,
      contentType || getMimeTypeFromNameOrUrl(filename || url),
    );
    const mimeType = contentType || getMimeTypeFromNameOrUrl(resolvedFileName, 'application/octet-stream');
    return { resolvedFileName, mimeType };
  }, []);

  const downloadToCache = useCallback(async (attachment: Attachment) => {
    const { resolvedFileName, mimeType } = buildFileMeta(attachment.url, attachment.filename, attachment.contentType);
    const target = `${FileSystem.cacheDirectory}${Date.now()}-${resolvedFileName}`;
    await FileSystem.downloadAsync(attachment.url, target);
    return { target, resolvedFileName, mimeType };
  }, [buildFileMeta]);

  const handleDownload = useCallback(async (attachment: Attachment) => {
    try {
      setDownloadingUrl(attachment.url);
      const { target, resolvedFileName, mimeType } = await downloadToCache(attachment);
      const safeName = resolvedFileName;

      if (Platform.OS === 'android') {
        if (!DownloadToDownloads?.saveToDownloads) {
          throw new Error('Native download module is not available');
        }

        const savedUri = await DownloadToDownloads.saveToDownloads(attachment.url, safeName, mimeType);
        Alert.alert('Saved', `Saved to Downloads: ${safeName}`);
        return savedUri;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(target, {
          mimeType,
          dialogTitle: 'Save attachment',
        });
        return;
      }
      Alert.alert('Download complete', `Saved to cache: ${safeName}`);
    } catch (err: any) {
      Alert.alert('Download failed', err?.message || 'Could not download attachment');
    } finally {
      setDownloadingUrl(null);
    }
  }, [downloadToCache]);

  const handleShare = useCallback(async (attachment: Attachment) => {
    try {
      setDownloadingUrl(attachment.url);
      const { target, resolvedFileName, mimeType } = await downloadToCache(attachment);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(target, {
        mimeType,
        dialogTitle: `Share ${resolvedFileName}`,
      });
    } catch (err: any) {
      Alert.alert('Share failed', err?.message || 'Could not share attachment');
    } finally {
      setDownloadingUrl(null);
    }
  }, [downloadToCache]);

  if (!attachments.length) return null;

  return (
    <View style={styles.container}>
      {imageAttachments.length > 0 && (
        <View style={styles.imageGrid}>
          {imageAttachments.map((att, index) => (
            <TouchableOpacity
              key={att.id || `${att.url}-${index}`}
              activeOpacity={0.85}
              onPress={() => setSelectedAttachment(att)}
              style={styles.imageWrap}
            >
              <Image
                source={{ uri: att.url }}
                contentFit="cover"
                style={styles.image}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {fileAttachments.length > 0 && (
        <View style={styles.fileList}>
          {fileAttachments.map((att, index) => (
            <View key={att.id || `${att.url}-${index}`} style={styles.fileItem}>
              <Ionicons name="document-outline" size={18} color={DiscordColors.textSecondary} />
              <ThemedText numberOfLines={1} style={styles.fileName}>
                {buildFileMeta(att.url, att.filename, att.contentType).resolvedFileName}
              </ThemedText>
              <TouchableOpacity
                onPress={() => handleShare(att)}
                style={styles.shareBtn}
                disabled={downloadingUrl === att.url}
              >
                {downloadingUrl === att.url ? (
                  <ActivityIndicator size="small" color={DiscordColors.blurple} />
                ) : (
                  <Ionicons name="share-outline" size={18} color={DiscordColors.blurple} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDownload(att)}
                style={styles.downloadBtn}
                disabled={downloadingUrl === att.url}
              >
                {downloadingUrl === att.url ? (
                  <ActivityIndicator size="small" color={DiscordColors.blurple} />
                ) : (
                  <Ionicons name="download-outline" size={18} color={DiscordColors.blurple} />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={!!selectedAttachment}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAttachment(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setSelectedAttachment(null)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {!!selectedAttachment && (
            <Image
              source={{ uri: selectedAttachment.url }}
              contentFit="contain"
              style={styles.modalImage}
            />
          )}

          {!!selectedAttachment && (
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => handleShare(selectedAttachment)}
                disabled={downloadingUrl === selectedAttachment.url}
              >
                {downloadingUrl === selectedAttachment.url ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="share-outline" size={18} color="#fff" />
                )}
                <ThemedText style={styles.modalActionText}>Share</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalDownloadBtn]}
                onPress={() => handleDownload(selectedAttachment)}
                disabled={downloadingUrl === selectedAttachment.url}
              >
                {downloadingUrl === selectedAttachment.url ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="download-outline" size={18} color="#fff" />
                )}
                <ThemedText style={styles.modalActionText}>Download</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

export const MessageAttachments = memo(MessageAttachmentsInner);

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  imageGrid: {
    gap: Spacing.sm,
  },
  imageWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: 260,
  },
  image: {
    width: 260,
    height: 180,
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  fileList: {
    gap: 6,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
  },
  fileName: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: DiscordColors.textSecondary,
    fontSize: 13,
  },
  downloadBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  shareBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '70%',
  },
  modalActions: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    gap: 12,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DiscordColors.blurple,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    minWidth: 120,
  },
  modalDownloadBtn: {
    backgroundColor: DiscordColors.green,
  },
  modalActionText: {
    color: '#fff',
    fontWeight: '700',
  },
});
