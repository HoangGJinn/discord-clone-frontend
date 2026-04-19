import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { NAMEPLATE_EFFECTS } from '@/constants/profileEffects';

interface UserRowNameplateProps {
  cardEffectId?: string | null;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * A wrapper component for user list items (rows).
 * If the user has a cardEffectId, it renders a nameplate background effect.
 */
export const UserRowNameplate: React.FC<UserRowNameplateProps> = ({ 
  cardEffectId, 
  children, 
  style 
}) => {
  const activeEffect = cardEffectId ? NAMEPLATE_EFFECTS.find(e => e.id === cardEffectId) : null;

  return (
    <View style={[styles.wrapper, style]}>
      {activeEffect && (
        <Image
          source={activeEffect.uri}
          style={styles.backgroundImage}
          pointerEvents="none"
          contentFit="cover"
        />
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12, // Standard rounded corners for user bars
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9, // High opacity as Nameplates are rich backgrounds
    zIndex: 0,
  },
  content: {
    zIndex: 1, // Ensure content sits on top of background
    flexDirection: 'row',
    alignItems: 'center',
  },
});
