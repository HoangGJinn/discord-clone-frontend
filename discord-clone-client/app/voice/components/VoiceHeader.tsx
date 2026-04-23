import { styles } from '@/app/voice/styles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type VoiceHeaderProps = {
  channelName: string;
  status: 'connecting' | 'connected' | 'error';
  participantCount: number;
  isDeafened: boolean;
  onLeave: () => void;
  onToggleDeafen: () => void;
};

export function VoiceHeader({
  channelName,
  status,
  participantCount,
  isDeafened,
  onLeave,
  onToggleDeafen,
}: VoiceHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onLeave} style={styles.headerBtn}>
        <Ionicons name="chevron-down" size={26} color="#fff" />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerChannel} numberOfLines={1}>
          {channelName || 'Voice channel'}
        </Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  status === 'connected' ? '#3BA55C' : status === 'error' ? '#ED4245' : '#FAA61A',
              },
            ]}
          />
          <Text style={styles.statusText}>
            {status === 'connected'
              ? 'Đã kết nối'
              : status === 'error'
                ? 'Lỗi kết nối'
                : 'Đang kết nối...'}
          </Text>
        </View>
        <Text style={styles.memberCountText}>{participantCount} người trong phòng</Text>
      </View>

      <TouchableOpacity style={styles.headerBtn} onPress={onToggleDeafen}>
        <Ionicons
          name={isDeafened ? 'volume-mute' : 'volume-high'}
          size={22}
          color={isDeafened ? '#ED4245' : '#fff'}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.headerBtn}>
        <Ionicons name="person-add-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default VoiceHeader;
