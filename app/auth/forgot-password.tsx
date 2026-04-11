import { CustomButton } from "@/components/auth/CustomButton";
import { CustomInput } from "@/components/auth/CustomInput";
import { DiscordColors, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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

type Step = "email" | "otp";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const resendOtp = useAuthStore((state) => state.resendOtp);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<{ email?: string; otp?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: "Vui lòng nhập email" }));
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setErrors((prev) => ({ ...prev, email: "Email không hợp lệ" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, email: undefined }));
    return true;
  };

  const validateOtp = () => {
    if (!otp.trim()) {
      setErrors((prev) => ({ ...prev, otp: "Vui lòng nhập OTP" }));
      return false;
    }
    if (otp.trim().length !== 6) {
      setErrors((prev) => ({ ...prev, otp: "OTP phải có đúng 6 ký tự" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, otp: undefined }));
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateEmail()) return;

    setSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setStep("otp");
      setOtp("");
      setErrors({});
    } catch (error) {
      Alert.alert("Không thể gửi OTP", error instanceof Error ? error.message : "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!validateEmail() || !validateOtp()) return;

    setVerifying(true);
    try {
      router.push({
        pathname: "/auth/reset-password",
        params: { email: email.trim(), otp: otp.trim() },
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!validateEmail()) return;

    setResending(true);
    try {
      await resendOtp({ email: email.trim(), type: "RESET_PASSWORD" });
      Alert.alert("Đã gửi lại OTP", "Mã OTP mới đã được gửi tới email của bạn.");
    } catch (error) {
      Alert.alert("Không thể gửi lại OTP", error instanceof Error ? error.message : "Đã xảy ra lỗi");
    } finally {
      setResending(false);
    }
  };

  const backToEditEmail = () => {
    setStep("email");
    setOtp("");
    setErrors((prev) => ({ ...prev, otp: undefined }));
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
              <Ionicons name="mail-outline" size={40} color={DiscordColors.blurple} />
            </View>
            <Text style={styles.title}>Quên mật khẩu</Text>
            <Text style={styles.subtitle}>Nhập email để nhận OTP đặt lại mật khẩu</Text>
          </View>

          <View style={styles.form}>
            <CustomInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Nhập email tài khoản"
              editable={step === "email"}
            />

            {step === "email" ? (
              <CustomButton title="Gửi mã xác nhận" onPress={handleSendOtp} loading={submitting} />
            ) : (
              <>
                <View style={styles.lockedEmailRow}>
                  <Text style={styles.lockedEmailText}>Mã OTP đã gửi tới: {email.trim()}</Text>
                  <TouchableOpacity onPress={backToEditEmail}>
                    <Text style={styles.editEmailText}>Sửa Email</Text>
                  </TouchableOpacity>
                </View>

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

                <CustomButton title="Xác nhận mã" onPress={handleVerifyOtp} loading={verifying} />

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendOtp}
                  activeOpacity={0.8}
                  disabled={resending}
                >
                  <Text style={styles.resendText}>
                    {resending ? "Đang gửi lại OTP..." : "Gửi lại mã"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
  form: {
    width: "100%",
  },
  lockedEmailRow: {
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
  },
  lockedEmailText: {
    color: DiscordColors.textSecondary,
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  editEmailText: {
    color: DiscordColors.textLink,
    fontSize: 14,
    fontWeight: "600",
  },
  resendButton: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  resendText: {
    color: DiscordColors.textLink,
    fontSize: 15,
    fontWeight: "600",
  },
});
