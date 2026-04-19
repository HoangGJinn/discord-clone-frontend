import { ThemedText } from '@/components/themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';

interface EffectItem {
  id: string;
  name: string;
  uri: any;
}

interface EffectModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  data: EffectItem[];
  currentSelectedId?: string | null;
  onSelect: (item: EffectItem | null) => void;
  canSelect?: boolean;
  lockHint?: string;
  onPressLockedAction?: () => void;
}

export const EffectModal: React.FC<EffectModalProps> = ({
  visible,
  onClose,
  title,
  data,
  currentSelectedId,
  onSelect,
  canSelect = true,
  lockHint,
  onPressLockedAction,
}) => {
  const renderItem = ({ item }: { item: EffectItem }) => {
    const isSelected = currentSelectedId === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          isSelected && styles.itemSelected,
          !canSelect && styles.itemLocked,
        ]}
        onPress={() => {
          if (!canSelect) return;
          onSelect(item);
          onClose();
        }}
      >
        <View style={styles.imageWrap}>
          <Image source={item.uri} style={styles.previewImage} contentFit="contain" />
        </View>
        <ThemedText style={styles.itemName} numberOfLines={1}>
          {item.name}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />

          {!canSelect ? (
            <View style={styles.lockBanner}>
              <Ionicons name="diamond-outline" size={15} color={DiscordColors.textPrimary} />
              <ThemedText style={styles.lockText}>{lockHint || 'Bạn cần Nitro để chọn hiệu ứng này.'}</ThemedText>
              {onPressLockedAction ? (
                <TouchableOpacity style={styles.lockActionButton} onPress={onPressLockedAction}>
                  <ThemedText style={styles.lockActionText}>Mua Nitro</ThemedText>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity
              hitSlop={10}
              onPress={() => {
                if (canSelect) {
                  onSelect(null);
                }
                onClose();
              }}
            >
              <ThemedText style={[styles.clearText, !canSelect && styles.clearTextDisabled]}>Gỡ bỏ</ThemedText>
            </TouchableOpacity>
          </View>

          <FlatList
            data={data}
            keyExtractor={(it) => it.id}
            numColumns={3}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  bottomSheet: {
    backgroundColor: '#1F212B',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: Spacing.sm,
    maxHeight: '80%',
    minHeight: '50%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: DiscordColors.textMuted,
    opacity: 0.5,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  lockBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(88,101,242,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(88,101,242,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: DiscordColors.textSecondary,
  },
  lockActionButton: {
    borderRadius: 999,
    backgroundColor: DiscordColors.blurple,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lockActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: DiscordColors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  clearText: {
    color: DiscordColors.red,
    fontSize: 15,
    fontWeight: '600',
  },
  clearTextDisabled: {
    color: DiscordColors.textMuted,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  columnWrapper: {
    gap: Spacing.md,
    justifyContent: 'flex-start',
  },
  itemContainer: {
    flex: 1,
    maxWidth: '31%',
    aspectRatio: 0.8,
    backgroundColor: '#2B2F37',
    borderRadius: 12,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: DiscordColors.blurple,
    backgroundColor: '#353A45',
  },
  itemLocked: {
    opacity: 0.6,
  },
  imageWrap: {
    width: 64,
    height: 64,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  itemName: {
    fontSize: 12,
    color: DiscordColors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
