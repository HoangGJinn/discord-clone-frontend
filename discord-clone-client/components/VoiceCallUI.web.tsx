import React, { memo } from 'react';
import { View, StyleSheet, Modal, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { Avatar } from './Avatar';
import { DiscordColors } from '@/constants/theme';

/**
 * VoiceCallUI - Web Fallback
 * Voice and Video calls are currently native-only.
 */

export const VoiceCallUI = memo(({ visible, onLeave, remoteUserName, remoteUserAvatar }: any) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onLeave}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.content}>
          <TouchableOpacity style={styles.closeBtn} onPress={onLeave}>
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.main}>
            <Avatar name={remoteUserName} uri={remoteUserAvatar} size={120} />
            <ThemedText style={styles.name}>{remoteUserName}</ThemedText>
            <ThemedText style={styles.status}>
              Voice and Video calls are not yet supported on the web version.
            </ThemedText>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.endBtn} onPress={onLeave}>
              <Ionicons name="call" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    alignSelf: 'flex-start',
    padding: 10,
  },
  main: {
    alignItems: 'center',
    gap: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  status: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  controls: {
    marginBottom: 40,
  },
  endBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DiscordColors.red,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '135deg' }],
  },
});

export default VoiceCallUI;
