import { styles } from '@/app/voice/styles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

type ControlBarProps = {
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleMute: () => void;
  onBackToChat: () => void;
  onToggleDeafen: () => void;
  onLeave: () => void;
};

export function ControlBar({
  isCameraOn,
  isScreenSharing,
  isMuted,
  isDeafened,
  onToggleCamera,
  onToggleScreenShare,
  onToggleMute,
  onBackToChat,
  onToggleDeafen,
  onLeave,
}: ControlBarProps) {
  return (
    <View style={styles.controls}>
      <TouchableOpacity
        style={[styles.controlBtn, isCameraOn && styles.controlBtnActive]}
        onPress={onToggleCamera}
      >
        <Ionicons
          name={isCameraOn ? 'videocam' : 'videocam-off-outline'}
          size={24}
          color={isCameraOn ? '#fff' : '#b9bbbe'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlBtn, isScreenSharing && styles.controlBtnActive]}
        onPress={onToggleScreenShare}
      >
        <Ionicons
          name={isScreenSharing ? 'desktop' : 'desktop-outline'}
          size={22}
          color={isScreenSharing ? '#fff' : '#b9bbbe'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
        onPress={onToggleMute}
      >
        <Ionicons
          name={isMuted ? 'mic-off' : 'mic-outline'}
          size={24}
          color={isMuted ? '#fff' : '#b9bbbe'}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.controlBtn} onPress={onBackToChat}>
        <Ionicons name="chatbubble-outline" size={24} color="#b9bbbe" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlBtn, isDeafened && styles.controlBtnActive]}
        onPress={onToggleDeafen}
      >
        <Ionicons
          name={isDeafened ? 'volume-mute' : 'volume-medium-outline'}
          size={24}
          color={isDeafened ? '#fff' : '#b9bbbe'}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.leaveBtn} onPress={onLeave}>
        <Ionicons
          name="call"
          size={24}
          color="#fff"
          style={{ transform: [{ rotate: '135deg' }] }}
        />
      </TouchableOpacity>
    </View>
  );
}

export default ControlBar;
