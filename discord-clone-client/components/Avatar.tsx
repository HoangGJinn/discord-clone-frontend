import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './themed-text';
import { DiscordColors } from '@/constants/theme';
import { AVATAR_EFFECTS } from '@/constants/profileEffects';
import { useEffectStore } from '@/store/useEffectStore';

interface AvatarProps {
  uri?: string;
  name?: string | null;
  size?: number;
  status?: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
  style?: ViewStyle;
  avatarEffectId?: string | number | null;
}

const statusColors = {
  ONLINE: DiscordColors.green,
  IDLE: DiscordColors.yellow,
  DND: DiscordColors.red,
  OFFLINE: '#747F8D',
};

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40, status, style, avatarEffectId }) => {
  const getEffectById = useEffectStore((state) => state.getEffectById);
  const safeName = typeof name === 'string' ? name.trim() : '';
  const initials = safeName ? safeName.charAt(0).toUpperCase() : '?';
  const indicatorSize = size / 3.2;
  const indicatorBorderSize = size / 12;

  // Resolve effect: try dynamic store first, then fallback to static constants
  const dynamicEffect = getEffectById(avatarEffectId);
  const staticEffect = !dynamicEffect && avatarEffectId ? AVATAR_EFFECTS.find((e) => String(e.id) === String(avatarEffectId)) : null;
  
  const activeEffectUri = dynamicEffect ? dynamicEffect.imageUrl : staticEffect?.uri;
  const effectSize = size * 1.4;
  const effectOffset = -(effectSize - size) / 2;

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
      
      {activeEffectUri && (
        <Image
          source={activeEffectUri}
          style={[
            styles.effectImage,
            {
              width: effectSize,
              height: effectSize,
              left: effectOffset,
              top: effectOffset,
            }
          ]}
          pointerEvents="none"
          contentFit="cover"
        />
      )}

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
    zIndex: 15,
    borderColor: DiscordColors.primaryBackground, // Matches background to create gap effect
    bottom: -2,
    right: -2,
  },
  effectImage: {
    position: 'absolute',
    zIndex: 10,
  },
});
