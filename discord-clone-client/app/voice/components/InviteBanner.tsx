import { styles } from '@/app/voice/styles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export function InviteBanner() {
  return (
    <TouchableOpacity style={styles.inviteBanner} activeOpacity={0.7}>
      <View style={styles.inviteIcon}>
        <Ionicons name="person-add-outline" size={20} color="#b9bbbe" />
      </View>
      <View style={styles.inviteText}>
        <Text style={styles.inviteTitle}>Thêm người vào Trò Chuyện Thoại</Text>
        <Text style={styles.inviteSub}>Cho nhóm biết bạn đang ở đây!</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#72767d" />
    </TouchableOpacity>
  );
}

export default InviteBanner;
