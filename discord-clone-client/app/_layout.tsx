import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { useAuthStore } from '@/store/useAuthStore';
import { useFriendStore } from '@/store/useFriendStore';
import { useGlobalCallStore } from '@/store/useGlobalCallStore';
import { useDMCallStore } from '@/store/useDMCallStore';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DiscordColors } from '@/constants/theme';
import socketService from '@/services/socketService';
import { IncomingCallOverlay } from '@/components/IncomingCallOverlay';
import { DMCallState } from '@/services/dmCallService';

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
  const showIncoming = useGlobalCallStore((state) => state.showIncoming);
  const clearIncoming = useGlobalCallStore((state) => state.clearIncoming);

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
        console.warn('Presence subscription warning:', error);
      }
    };

    void subscribeToPresence();

    return () => {
      socketService.unsubscribe('/topic/presence');
    };
  }, [isAuthenticated, isLoading, updateFriendStatus]);

  // ── Global Incoming Call Subscription ──────────────
  useEffect(() => {
    if (!isAuthenticated || isLoading || !user?.id) return;

    const userId = user.id.toString();
    const destination = `/topic/user/${userId}/incoming-call`;

    const subscribeToIncomingCall = async () => {
      try {
        interface IncomingCallMessage {
          type?: string;
          callState?: DMCallState;
          callerId?: string;
          receiverId?: string;
          callerName?: string;
          callerAvatar?: string;
          callType?: string;
          conversationId?: string;
        }

        await socketService.subscribe<IncomingCallMessage>(destination, (message) => {
          console.log('[RootLayout] Incoming call WS message:', message);

          if (!message || !message.type) return;

          switch (message.type) {
            case 'CALL_INCOMING': {
              // Chỉ hiển thị cho receiver, không phải caller
              if (message.callState && message.callState.callerId !== userId) {
                const dmCallStore = useDMCallStore.getState();
                
                // BUSY logic: Nếu đang ở trong cuộc gọi khác, không hiện overlay
                if (dmCallStore.activeCall) {
                  if (dmCallStore.activeCall.conversationId === message.callState.conversationId) {
                      // Cùng 1 cuộc gọi, local handler sẽ xử lý (ví dụ đang ở trong DM chat)
                      return;
                  }
                  // Đang bận cuộc gọi khác
                  console.log('[RootLayout] BUSY: Already in another call');
                  return;
                }
                
                showIncoming(message.callState);
              }
              break;
            }
            case 'CALL_ACCEPTED':
            case 'CALL_DECLINED':
            case 'CALL_ENDED':
            case 'CALL_MISSED':
              // Ẩn overlay khi cuộc gọi kết thúc/từ chối
              clearIncoming();
              break;
          }
        });
      } catch (error) {
        console.warn('Incoming call subscription warning:', error);
      }
    };

    void subscribeToIncomingCall();

    return () => {
      socketService.unsubscribe(destination);
    };
  }, [isAuthenticated, isLoading, user?.id, showIncoming, clearIncoming]);

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
      {/* Global Incoming Call Overlay - hiển thị bất kể đang ở screen nào */}
      <IncomingCallOverlay />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
