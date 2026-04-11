import { CustomButton } from "@/components/auth/CustomButton";
import { CustomInput } from "@/components/auth/CustomInput";
import { DiscordColors, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VerifyEmailScreen() {
  const verifyAccount = useAuthStore((state) => state.verifyAccount);
  const params = useLocalSearchParams<{ email?: string; userName?: string }>();

  const [email, setEmail] = useState(params.email || "");
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<{ email?: string; otp?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const emailFromParams = useMemo(() => !!params.email, [params.email]);

  const validateForm = () => {
    const nextErrors: { email?: string; otp?: string } = {};
    if (!email.trim()) {
      nextErrors.email = "Vui lòng nhập email";
    } else if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = "Email không hợp lệ";
    }

    if (!otp.trim()) {
      nextErrors.otp = "Vui lòng nhập mã OTP";
    } else if (otp.trim().length !== 6) {
      nextErrors.otp = "Mã OTP phải có đúng 6 ký tự";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleVerify = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await verifyAccount({ email: email.trim(), otp: otp.trim() });
      Alert.alert("Xác thực thành công", "Tài khoản đã được xác thực. Vui lòng đăng nhập.", [
        { text: "Đăng nhập", onPress: () => router.replace("/auth/login") },
      ]);
    } catch (error) {
      Alert.alert("Không thể xác thực", error instanceof Error ? error.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={DiscordColors.textSecondary} />
            <Text style={styles.backText}>Quay lại</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield-checkmark-outline" size={40} color={DiscordColors.blurple} />
            </View>
            <Text style={styles.title}>Xác thực tài khoản</Text>
            <Text style={styles.subtitle}>
              Nhập email và mã OTP đã gửi qua mail để kích hoạt tài khoản.
            </Text>
            {!!params.userName && !params.email && (
              <Text style={styles.tipText}>
                Bạn đăng nhập bằng username: @{params.userName}. Vui lòng nhập đúng email đã đăng ký.
              </Text>
            )}
          </View>

          <View style={styles.form}>
            <CustomInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                if (!emailFromParams) {
                  setEmail(text);
                }
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={errors.email}
              placeholder="Nhập email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!emailFromParams}
            />

            <CustomInput
              label="Mã OTP"
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/[^0-9a-zA-Z]/g, "").slice(0, 6));
                setErrors((prev) => ({ ...prev, otp: undefined }));
              }}
              error={errors.otp}
              placeholder="Nhập OTP 6 ký tự"
              maxLength={6}
              autoCapitalize="characters"
            />

            <CustomButton title="Xác thực tài khoản" onPress={handleVerify} loading={submitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DiscordColors.secondaryBackground,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  backText: {
    color: DiscordColors.textSecondary,
    fontSize: 15,
    marginLeft: Spacing.xs,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  iconWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    color: DiscordColors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: DiscordColors.textSecondary,
    fontSize: 15,
    textAlign: "center",
  },
  tipText: {
    marginTop: Spacing.sm,
    color: DiscordColors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
});
