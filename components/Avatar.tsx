import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './themed-text';
import { DiscordColors } from '@/constants/theme';

interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
  status?: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
  style?: ViewStyle;
}

const statusColors = {
  ONLINE: DiscordColors.green,
  IDLE: DiscordColors.yellow,
  DND: DiscordColors.red,
  OFFLINE: '#747F8D',
};

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40, status, style }) => {
  const initials = name.charAt(0).toUpperCase();
  const indicatorSize = size / 3.2;
  const indicatorBorderSize = size / 12;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <View style={[styles.avatarBorder, { borderRadius: size / 2.2 }]}>
        {uri ? (
          <Image source={{ uri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2.2 }]} />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2.2 }]}>
            <ThemedText style={[styles.initials, { fontSize: size / 2.2 }]}>{initials}</ThemedText>
          </View>
        )}
      </View>
      
      {status && (
        <View 
          style={[
            styles.statusIndicator, 
            { 
              width: indicatorSize, 
              height: indicatorSize, 
              borderRadius: indicatorSize / 2,
              backgroundColor: statusColors[status],
              borderWidth: indicatorBorderSize,
            }
          ]} 
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatarBorder: {
    overflow: 'hidden',
  },
  image: {
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  placeholder: {
    backgroundColor: DiscordColors.blurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
  statusIndicator: {
    position: 'absolute',
    borderColor: DiscordColors.primaryBackground, // Matches background to create gap effect
    bottom: -2,
    right: -2,
  },
});
