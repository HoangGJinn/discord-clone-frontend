import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DiscordColors } from '@/constants/theme';

/**
 * VoiceRoomScreen - Web Fallback
 * Voice rooms are currently native-only.
 */

export default function VoiceRoomScreen() {
  const router = useRouter();
  const { channelName } = useLocalSearchParams<{ channelName: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}># {channelName || 'Voice Room'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mic-off" size={80} color={DiscordColors.red} />
        </View>
        <Text style={styles.title}>Web Voice Not Supported</Text>
        <Text style={styles.description}>
          Voice and Video channels are currently only available on our mobile app. 
          Please use the Discord Clone mobile app to join this channel.
        </Text>
        
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backHomeText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#313338', // Discord dark background
  },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#26272d',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(250, 119, 124, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#b5bac1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  backHomeBtn: {
    backgroundColor: '#5865F2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  backHomeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
