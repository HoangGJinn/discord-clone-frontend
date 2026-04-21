import { styles } from '@/app/voice/styles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type ViewModeSwitchProps = {
  viewMode: 'spotlight' | 'grid';
  onChangeMode: (mode: 'spotlight' | 'grid') => void;
  matchSharerView: boolean;
  onToggleMatchSharerView: () => void;
};

export function ViewModeSwitch({
  viewMode,
  onChangeMode,
  matchSharerView,
  onToggleMatchSharerView,
}: ViewModeSwitchProps) {
  return (
    <View style={styles.viewModeBar}>
      <TouchableOpacity
        style={[styles.viewModeBtn, viewMode === 'spotlight' && styles.viewModeBtnActive]}
        onPress={() => onChangeMode('spotlight')}
      >
        <Ionicons
          name="scan-outline"
          size={14}
          color={viewMode === 'spotlight' ? '#fff' : '#b9bbbe'}
        />
        <Text style={[styles.viewModeBtnText, viewMode === 'spotlight' && styles.viewModeBtnTextActive]}>
          Spotlight
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeBtnActive]}
        onPress={() => onChangeMode('grid')}
      >
        <Ionicons name="grid-outline" size={14} color={viewMode === 'grid' ? '#fff' : '#b9bbbe'} />
        <Text style={[styles.viewModeBtnText, viewMode === 'grid' && styles.viewModeBtnTextActive]}>
          Grid
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.viewModeBtn, matchSharerView && styles.viewModeBtnActive]}
        onPress={onToggleMatchSharerView}
      >
        <Ionicons
          name="sync-outline"
          size={14}
          color={matchSharerView ? '#fff' : '#b9bbbe'}
        />
        <Text style={[styles.viewModeBtnText, matchSharerView && styles.viewModeBtnTextActive]}>
          Match
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default ViewModeSwitch;
