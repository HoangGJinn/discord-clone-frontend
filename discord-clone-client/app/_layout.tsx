import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { useAuthStore } from '@/store/useAuthStore';
import { useFriendStore } from '@/store/useFriendStore';
import { useDMStore } from '@/store/useDMStore';
import { useEffectStore } from '@/store/useEffectStore';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DiscordColors } from '@/constants/theme';
import socketService from '@/services/socketService';
import { DirectMessage } from '@/types/dm';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const segments = useSegments();
  const router = useRouter();
  const updateFriendStatus = useFriendStore((state) => state.updateFriendStatus);
  const applyRealtimeQueueEvent = useDMStore((state) => state.applyRealtimeQueueEvent);
  const fetchConversations = useDMStore((state) => state.fetchConversations);

  useEffect(() => {
    void useAuthStore.getState().initialize();
    void useEffectStore.getState().fetchEffects();
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
      void socketService.connect().catch(() => undefined);
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
        console.warn('Presence subscription warning:', error);
      }
    };

    void subscribeToPresence();

    return () => {
      socketService.unsubscribe('/topic/presence');
    };
  }, [isAuthenticated, isLoading, updateFriendStatus]);

  // ── Global DM Queue Subscription (updates DM list in any screen) ──────────────
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const destination = '/user/queue/dm';
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const onDmQueueMessage = (message: DirectMessage) => {
      try {
        const applied = applyRealtimeQueueEvent(message as DirectMessage);
        if (!applied) {
          void fetchConversations();
          return;
        }

        // Safety net for partial payloads from queue events.
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
        }
        fallbackTimer = setTimeout(() => {
          void fetchConversations();
          fallbackTimer = null;
        }, 1200);
      } catch (err) {
        console.warn('DM queue message handling warning:', err);
        void fetchConversations();
      }
    };

    const subscribeToDmQueue = async () => {
      try {
        await socketService.subscribe(destination, onDmQueueMessage);
      } catch (error) {
        console.warn('DM queue subscription warning:', error);
      }
    };

    void subscribeToDmQueue();

    return () => {
      socketService.unsubscribe(destination, onDmQueueMessage);
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
    };
  }, [isAuthenticated, isLoading, applyRealtimeQueueEvent, fetchConversations]);

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
