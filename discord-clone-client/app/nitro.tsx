import { CustomButton } from '@/components/auth/CustomButton';
import { DiscordColors, Spacing } from '@/constants/theme';
import {
  MOBILE_VNPAY_RETURN_PREFIX,
  NITRO_PRICE_VND,
  paymentService,
} from '@/services/paymentService';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';

const formatCurrency = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;

export default function NitroScreen() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isOpeningPayment, setIsOpeningPayment] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isFreshlyActivated, setIsFreshlyActivated] = useState(false);
  const handlingCallbackRef = useRef(false);

  const isNitro = useMemo(() => Boolean(user?.isPremium), [user?.isPremium]);

  const handleStartPayment = async () => {
    if (isNitro) {
      Alert.alert('Thông báo', 'Tài khoản của bạn đã có Nitro.');
      return;
    }

    try {
      setIsOpeningPayment(true);
      const data = await paymentService.createNitroPayment(NITRO_PRICE_VND, token || undefined);
      setPaymentUrl(data.url);
    } catch (error: any) {
      Alert.alert('Không thể tạo thanh toán', error?.message || 'Vui lòng thử lại.');
    } finally {
      setIsOpeningPayment(false);
    }
  };

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    const callbackUrl = navState.url;
    if (!callbackUrl?.startsWith(MOBILE_VNPAY_RETURN_PREFIX)) {
      return;
    }

    if (handlingCallbackRef.current) {
      return;
    }

    handlingCallbackRef.current = true;
    setPaymentUrl(null);

    try {
      setIsConfirmingPayment(true);
      const callbackParams = paymentService.extractVnpParamsFromUrl(callbackUrl);
      const confirmResult = await paymentService.confirmMobilePayment(callbackParams, token || undefined);

      if (confirmResult.RspCode === '00') {
        await refreshProfile();
        setIsFreshlyActivated(true);
        Alert.alert('Thành công', 'Thanh toán thành công. Nitro đã được kích hoạt cho tài khoản của bạn.');
      } else {
        Alert.alert('Thanh toán chưa thành công', confirmResult.Message || 'Vui lòng thử lại.');
      }
    } catch (error: any) {
      Alert.alert('Xác nhận thanh toán thất bại', error?.message || 'Vui lòng thử lại.');
    } finally {
      setIsConfirmingPayment(false);
      handlingCallbackRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={DiscordColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nitro</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.badgeCard}>
          <Ionicons
            name={isNitro ? 'sparkles' : 'diamond-outline'}
            size={38}
            color={isNitro ? '#FEE75C' : DiscordColors.textSecondary}
          />
          <Text style={styles.statusTitle}>
            {isNitro ? 'Bạn đang có Nitro' : 'Nâng cấp Nitro'}
          </Text>
          <Text style={styles.statusDescription}>
            {isNitro
              ? 'Bạn đã mở khóa Trang trí ảnh đại diện, Hiệu ứng nền bìa và Hiệu ứng bảng tên.'
              : 'Mua Nitro để mở khóa toàn bộ hiệu ứng hồ sơ.'}
          </Text>

          {(isNitro || isFreshlyActivated) ? (
            <View style={styles.activeChip}>
              <Ionicons name="checkmark-circle" size={14} color="#A6F6C2" />
              <Text style={styles.activeChipText}>Nitro active</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>Gói Nitro</Text>
          <Text style={styles.planPrice}>{formatCurrency(NITRO_PRICE_VND)}</Text>
          <Text style={styles.planNote}>Thanh toán qua VNPay trong ứng dụng.</Text>
        </View>

        {isConfirmingPayment ? (
          <View style={styles.processingBox}>
            <ActivityIndicator size="small" color={DiscordColors.blurple} />
            <Text style={styles.processingText}>Đang xác nhận kết quả thanh toán...</Text>
          </View>
        ) : null}

        <CustomButton
          title={
            isNitro
              ? 'Đã có Nitro'
              : isOpeningPayment
                ? 'Đang mở cổng thanh toán...'
                : 'Mua Nitro'
          }
          onPress={handleStartPayment}
          disabled={isNitro || isOpeningPayment || isConfirmingPayment}
        />
      </View>

      <Modal visible={Boolean(paymentUrl)} animationType="slide" onRequestClose={() => setPaymentUrl(null)}>
        <SafeAreaView style={styles.webviewContainer}>
          <View style={styles.webviewHeader}>
            <Text style={styles.webviewTitle}>Thanh toán VNPay</Text>
            <TouchableOpacity onPress={() => setPaymentUrl(null)}>
              <Ionicons name="close" size={24} color={DiscordColors.textPrimary} />
            </TouchableOpacity>
          </View>

          {paymentUrl ? (
            <WebView
              source={{ uri: paymentUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color={DiscordColors.blurple} />
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DiscordColors.divider,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: DiscordColors.textPrimary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  badgeCard: {
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 14,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusTitle: {
    color: DiscordColors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  statusDescription: {
    color: DiscordColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  activeChip: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(87,242,135,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(87,242,135,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeChipText: {
    color: '#A6F6C2',
    fontSize: 12,
    fontWeight: '800',
  },
  planCard: {
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 14,
    padding: Spacing.lg,
  },
  planTitle: {
    fontSize: 18,
    color: DiscordColors.textPrimary,
    fontWeight: '700',
  },
  planPrice: {
    marginTop: Spacing.sm,
    fontSize: 34,
    color: '#FEE75C',
    fontWeight: '800',
  },
  planNote: {
    marginTop: Spacing.sm,
    color: DiscordColors.textSecondary,
  },
  processingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 10,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  processingText: {
    marginLeft: Spacing.sm,
    color: DiscordColors.textSecondary,
    fontSize: 13,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  webviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: DiscordColors.divider,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  webviewTitle: {
    color: DiscordColors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  webviewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DiscordColors.primaryBackground,
  },
});