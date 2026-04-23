import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@/api/client';

// Cấu hình cách hiển thị thông báo khi app đang bật (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    // Tạo 2 channel giống y hệt lúc nãy mình set ở Spring Boot Backend
    await Notifications.setNotificationChannelAsync('chat_messages', {
      name: 'Chat Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    
    await Notifications.setNotificationChannelAsync('social_notifications', {
      name: 'Social Notifications',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  // Bỏ chặn Device.isDevice vì máy ảo Android (có Google Play) VẪN nhận được FCM
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('❌ Failed to get push token for push notification!');
    return undefined;
  }

  try {
    // ⚠️ Quan trọng: Dùng getDevicePushTokenAsync để lấy raw FCM Token
    const tokenData = await Notifications.getDevicePushTokenAsync();
    token = tokenData.data;
    console.log('✅ Lấy được FCM Token thành công:', token);
  } catch (e) {
    console.error('❌ Lỗi khi lấy FCM Token (Có thể do máy ảo không có Google Play Services):', e);
  }

  return token;
}

export async function sendFcmTokenToBackend(fcmToken: string) {
  try {
    // Lấy deviceId từ AsyncStorage hoặc tạo mới nếu chưa có
    let deviceId = await AsyncStorage.getItem('device_id');
    if (!deviceId) {
      // Tạo một random ID đơn giản
      deviceId = 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 15);
      await AsyncStorage.setItem('device_id', deviceId);
    }

    await apiClient.post('/fcm/token', {
      deviceId,
      fcmToken
    });
    console.log('✅ Đã gửi FCM Token lên Backend thành công!');
  } catch (error) {
    console.error('❌ Lỗi gửi FCM Token lên Backend:', error);
  }
}
