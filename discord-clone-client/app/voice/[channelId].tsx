import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { ChannelResponse, getChannelById } from '@/services/serverService';

export default function VoiceChannelScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const router = useRouter();
  const [channelInfo, setChannelInfo] = useState<ChannelResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChannel = async () => {
      if (!channelId) {
        setChannelInfo(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await getChannelById(Number(channelId));
        setChannelInfo(response);
      } catch {
        setChannelInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadChannel();
  }, [channelId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={DiscordColors.textPrimary} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <ThemedText style={styles.title} numberOfLines={1}>
              {channelInfo?.name || 'Voice Channel'}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {channelInfo ? 'Voice room' : 'Loading channel details...'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.body}>
          {isLoading ? (
            <ActivityIndicator color={DiscordColors.blurple} />
          ) : (
            <>
              <View style={styles.voiceBadge}>
                <Ionicons name="volume-high" size={34} color={DiscordColors.blurple} />
              </View>
              <ThemedText style={styles.bodyTitle}>
                {channelInfo?.name || 'Voice channel'}
              </ThemedText>
              <ThemedText style={styles.bodySubtitle}>
                Voice screen is ready. You can connect audio behavior next.
              </ThemedText>
            </>
          )}
        </View>

        <View style={styles.controls}>
          <Pressable style={[styles.controlButton, styles.mutedButton]}>
            <Ionicons name="mic-off" size={20} color="#fff" />
          </Pressable>
          <Pressable style={[styles.controlButton, styles.endButton]} onPress={() => router.back()}>
            <Ionicons name="call-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable style={[styles.controlButton, styles.mutedButton]}>
            <Ionicons name="volume-high" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  container: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DiscordColors.secondaryBackground,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: DiscordColors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: DiscordColors.textMuted,
    fontSize: 13,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  voiceBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: DiscordColors.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyTitle: {
    color: DiscordColors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  bodySubtitle: {
    color: DiscordColors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  controlButton: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedButton: {
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  endButton: {
    backgroundColor: DiscordColors.red,
  },
});
