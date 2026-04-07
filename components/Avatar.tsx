import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './themed-text';

interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
  status?: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
  style?: ViewStyle;
}

const statusColors = {
  ONLINE: '#3BA55D',
  IDLE: '#FAA81A',
  DND: '#ED4245',
  OFFLINE: '#747F8D',
};

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40, status, style }) => {
  const initials = name.charAt(0).toUpperCase();
  const indicatorSize = size / 3.5;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <View style={[styles.avatarBorder, { borderRadius: size / 2 }]}>
        {uri ? (
          <Image source={{ uri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
            <ThemedText style={[styles.initials, { fontSize: size / 2.5 }]}>{initials}</ThemedText>
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
              bottom: 0,
              right: 0,
              borderWidth: size / 20
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
    backgroundColor: '#313338',
  },
  placeholder: {
    backgroundColor: '#5865F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    borderColor: '#1E1F22',
  },
});
