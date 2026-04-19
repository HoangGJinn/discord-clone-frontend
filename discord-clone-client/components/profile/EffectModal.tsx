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
}

export const EffectModal: React.FC<EffectModalProps> = ({
  visible,
  onClose,
  title,
  data,
  currentSelectedId,
  onSelect,
}) => {
  const renderItem = ({ item }: { item: EffectItem }) => {
    const isSelected = currentSelectedId === item.id;
    return (
      <TouchableOpacity
        style={[styles.itemContainer, isSelected && styles.itemSelected]}
        onPress={() => {
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
          
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity hitSlop={10} onPress={() => { onSelect(null); onClose(); }}>
              <ThemedText style={styles.clearText}>Gỡ bỏ</ThemedText>
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
