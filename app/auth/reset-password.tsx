import { CustomButton } from "@/components/auth/CustomButton";
import { CustomInput } from "@/components/auth/CustomInput";
import { DiscordColors, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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

export default function ResetPasswordScreen() {
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const params = useLocalSearchParams<{ email?: string; otp?: string }>();
  const hasVerifiedOtp = !!params.otp;

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    email: params.email || "",
    otp: params.otp || "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      nextErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Email không hợp lệ";
    }

    if (!hasVerifiedOtp) {
      if (!formData.otp.trim()) {
        nextErrors.otp = "Vui lòng nhập mã OTP";
      } else if (formData.otp.length !== 6) {
        nextErrors.otp = "OTP phải có đúng 6 ký tự";
      }
    }

    if (!formData.newPassword) {
      nextErrors.newPassword = "Vui lòng nhập mật khẩu mới";
    } else if (formData.newPassword.length < 6) {
      nextErrors.newPassword = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (formData.confirmPassword !== formData.newPassword) {
      nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await resetPassword({
        email: formData.email.trim(),
        otp: formData.otp.trim(),
        newPassword: formData.newPassword,
      });

      Alert.alert("Thành công", "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.", [
        { text: "Đăng nhập", onPress: () => router.replace("/auth/login") },
      ]);
    } catch (err) {
      Alert.alert("Không thể đổi mật khẩu", err instanceof Error ? err.message : "Đã xảy ra lỗi");
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
              <Ionicons name="key-outline" size={40} color={DiscordColors.blurple} />
            </View>
            <Text style={styles.title}>Đặt lại mật khẩu</Text>
            <Text style={styles.subtitle}>Nhập OTP và mật khẩu mới để hoàn tất</Text>
          </View>

          <View style={styles.form}>
            <CustomInput
              label="Email"
              value={formData.email}
              onChangeText={(text) => updateField("email", text)}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Nhập email"
              editable={!hasVerifiedOtp}
            />
            {!hasVerifiedOtp ? (
              <CustomInput
                label="Mã OTP"
                value={formData.otp}
                onChangeText={(text) =>
                  updateField("otp", text.replace(/[^0-9]/g, "").slice(0, 6))
                }
                error={errors.otp}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Nhập OTP 6 số"
              />
            ) : (
              <View style={styles.verifiedOtpBox}>
                <Ionicons name="checkmark-circle" size={18} color={DiscordColors.green} />
                <Text style={styles.verifiedOtpText}>OTP đã xác nhận thành công</Text>
              </View>
            )}
            <CustomInput
              label="Mật khẩu mới"
              value={formData.newPassword}
              onChangeText={(text) => updateField("newPassword", text)}
              error={errors.newPassword}
              isPassword
              placeholder="Nhập mật khẩu mới"
            />
            <CustomInput
              label="Xác nhận mật khẩu"
              value={formData.confirmPassword}
              onChangeText={(text) => updateField("confirmPassword", text)}
              error={errors.confirmPassword}
              isPassword
              placeholder="Nhập lại mật khẩu mới"
            />

            <CustomButton
              title="Đổi mật khẩu"
              onPress={handleSubmit}
              loading={submitting}
              style={{ marginTop: Spacing.sm }}
            />
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
  verifiedOtpBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(35,165,89,0.15)",
    borderWidth: 1,
    borderColor: "rgba(35,165,89,0.5)",
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  verifiedOtpText: {
    color: DiscordColors.green,
    marginLeft: Spacing.xs,
    fontWeight: "600",
  },
});
