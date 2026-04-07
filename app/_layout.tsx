import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { MOCK_FRIENDS, MOCK_RECEIVED_REQUESTS, MOCK_SENT_REQUESTS, MOCK_USER } from '@/constants/mockData';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendStore } from '@/store/useFriendStore';
import { useEffect } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initializeAuth = useAuthStore((state) => state.initialize);
  const login = useAuthStore((state) => state.login);
  const authState = useAuthStore();

  useEffect(() => {
    // Only use mock if needed
    const setup = async () => {
      await initializeAuth();
      
      // MOCK FOR DEVELOPMENT: Force mock user if not logged in
      if (!useAuthStore.getState().isAuthenticated) {
        console.log("Setting up MOCK DATA for testing...");
        await login(MOCK_USER, "mock-token-123");
        
        // Manually populate Friend Store with mock data
        useFriendStore.setState({
          friends: MOCK_FRIENDS,
          receivedRequests: MOCK_RECEIVED_REQUESTS,
          sentRequests: MOCK_SENT_REQUESTS
        });
      }
    };

    setup();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
