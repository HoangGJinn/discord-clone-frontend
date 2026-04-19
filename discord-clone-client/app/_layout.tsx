import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { useAuthStore } from '@/store/useAuthStore';
import { useFriendStore } from '@/store/useFriendStore';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DiscordColors } from '@/constants/theme';
import socketService from '@/services/socketService';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const segments = useSegments();
  const router = useRouter();
  const updateFriendStatus = useFriendStore((state) => state.updateFriendStatus);

  useEffect(() => {
    void useAuthStore.getState().initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, router, segments]);

  // ── WebSocket Lifecycle ──────────────────────────
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      socketService.connect();
    }
  }, [isAuthenticated, isLoading]);

  // ── Presence Subscription ──────────────────────────
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const subscribeToPresence = async () => {
      try {
        interface PresenceMessage {
          type: string;
          userId: number;
          status: string;
        }

        await socketService.subscribe<PresenceMessage>('/topic/presence', (message) => {
          if (message.type === 'STATUS_UPDATE' && message.userId && message.status) {
            updateFriendStatus(message.userId, message.status);
          }
        });
      } catch (error) {
        console.error('Error subscribing to presence:', error);
      }
    };

    void subscribeToPresence();

    return () => {
      socketService.unsubscribe('/topic/presence');
    };
  }, [isAuthenticated, isLoading, updateFriendStatus]);

  if (isLoading) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: DiscordColors.primaryBackground,
          }}
        >
          <ActivityIndicator size="large" color={DiscordColors.blurple} />
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dm/[conversationId]" options={{ headerShown: false }} />
        <Stack.Screen name="channel/[channelId]" options={{ headerShown: false }} />
        <Stack.Screen name="voice/[channelId]" options={{ headerShown: false }} />
        <Stack.Screen name="server/[serverId]/members" options={{ headerShown: false }} />
        <Stack.Screen name="change-password" options={{ headerShown: false }} />
        <Stack.Screen name="nitro" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        <Stack.Screen name="friends/add" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
