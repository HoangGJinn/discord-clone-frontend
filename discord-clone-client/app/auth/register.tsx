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

export default function RegisterScreen() {
  const registerAccount = useAuthStore((state) => state.registerAccount);
  const resendOtp = useAuthStore((state) => state.resendOtp);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      nextErrors.username = "Vui lòng nhập username";
    } else if (formData.username.trim().length < 3) {
      nextErrors.username = "Username phải có ít nhất 3 ký tự";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Email không hợp lệ";
    }

    if (!formData.displayName.trim()) {
      nextErrors.displayName = "Vui lòng nhập tên hiển thị";
    }

    if (!formData.password) {
      nextErrors.password = "Vui lòng nhập mật khẩu";
    } else if (formData.password.length < 6) {
      nextErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await registerAccount({
        username: formData.username.trim(),
        email: formData.email.trim(),
        displayName: formData.displayName.trim(),
        password: formData.password,
      });
      Alert.alert(
        "Đăng ký thành công",
        "Tài khoản đã được tạo. OTP xác thực đã gửi qua email, vui lòng xác thực trước khi đăng nhập.",
        [
          {
            text: "Xác thực ngay",
            onPress: () =>
              router.replace({
                pathname: "/auth/verify-email",
                params: { email: formData.email.trim(), userName: formData.username.trim() },
              }),
          },
          { text: "Để sau" },
        ],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      const email = formData.email.trim();
      const looksLikeExistsError = /already exists|đã tồn tại|email already/i.test(message);

      if (looksLikeExistsError && email) {
        try {
          await resendOtp({ email, type: "VERIFY_ACCOUNT" });
          Alert.alert(
            "Tài khoản chưa xác thực",
            "Tài khoản này đã được đăng ký, nhưng chưa xác thực. Bạn có muốn chuyển tới trang xác thực không?",
            [
              { text: "Không", style: "cancel" },
              {
                text: "Chuyển tới xác thực",
                onPress: () =>
                  router.push({
                    pathname: "/auth/verify-email",
                    params: { email, userName: formData.username.trim() || undefined },
                  }),
              },
            ],
          );
          return;
        } catch (resendError) {
          const resendMessage =
            resendError instanceof Error ? resendError.message : "Đã xảy ra lỗi";
          if (/đã.*xác thực|already verified/i.test(resendMessage)) {
            Alert.alert(
              "Đăng ký thất bại",
              "Tài khoản này đã tồn tại và đã xác thực. Vui lòng đăng nhập.",
            );
            return;
          }
        }
      }

      Alert.alert("Đăng ký thất bại", message);
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={DiscordColors.textSecondary} />
            <Text style={styles.backText}>Quay lại</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Đăng ký để bắt đầu sử dụng ứng dụng</Text>
          </View>

          <View style={styles.form}>
            <CustomInput
              label="Username"
              value={formData.username}
              onChangeText={(text) => updateField("username", text)}
              error={errors.username}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Nhập username"
            />
            <CustomInput
              label="Email"
              value={formData.email}
              onChangeText={(text) => updateField("email", text)}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Nhập email"
            />
            <CustomInput
              label="Tên hiển thị"
              value={formData.displayName}
              onChangeText={(text) => updateField("displayName", text)}
              error={errors.displayName}
              placeholder="Nhập tên hiển thị"
            />
            <CustomInput
              label="Mật khẩu"
              value={formData.password}
              onChangeText={(text) => updateField("password", text)}
              error={errors.password}
              isPassword
              placeholder="Nhập mật khẩu"
            />
            <CustomInput
              label="Xác nhận mật khẩu"
              value={formData.confirmPassword}
              onChangeText={(text) => updateField("confirmPassword", text)}
              error={errors.confirmPassword}
              isPassword
              placeholder="Nhập lại mật khẩu"
            />

            <CustomButton title="Đăng ký" onPress={handleRegister} loading={submitting} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.replace("/auth/login")}>
              <Text style={styles.link}>Đăng nhập</Text>
            </TouchableOpacity>
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
    marginBottom: Spacing.xl,
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
  },
  form: {
    marginBottom: Spacing.xl,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: Spacing.xl,
  },
  footerText: {
    color: DiscordColors.textSecondary,
    fontSize: 15,
  },
  link: {
    color: DiscordColors.textLink,
    fontSize: 15,
    fontWeight: "600",
  },
});
