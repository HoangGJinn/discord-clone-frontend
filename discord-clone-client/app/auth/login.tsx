import { CustomButton } from "@/components/auth/CustomButton";
import { CustomInput } from "@/components/auth/CustomInput";
import { DiscordColors, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

export default function LoginScreen() {
  const loginWithCredentials = useAuthStore((state) => state.loginWithCredentials);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ userName?: string; password?: string }>({});

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  const validateForm = () => {
    const nextErrors: { userName?: string; password?: string } = {};

    if (!userName.trim()) {
      nextErrors.userName = "Vui lòng nhập tên đăng nhập";
    }
    if (!password) {
      nextErrors.password = "Vui lòng nhập mật khẩu";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await loginWithCredentials({ userName, password });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      const isUnverifiedError =
        /chưa.*xác thực|not verified|unverified/i.test(message);

      if (isUnverifiedError) {
        Alert.alert(
          "Tài khoản chưa xác thực",
          "Tài khoản của bạn chưa xác thực email. Bạn có muốn chuyển tới trang xác thực không?",
          [
            { text: "Để sau", style: "cancel" },
            {
              text: "Xác thực ngay",
              onPress: () =>
                router.push({
                  pathname: "/auth/verify-email",
                  params: userName.includes("@") ? { email: userName } : { userName },
                }),
            },
          ],
        );
      } else {
        Alert.alert("Đăng nhập thất bại", message);
      }
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
        >
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Ionicons name="chatbubble-ellipses" size={42} color={DiscordColors.blurple} />
            </View>
            <Text style={styles.title}>Đăng nhập</Text>
            <Text style={styles.subtitle}>Chào mừng quay lại Discord Clone</Text>
          </View>

          <View style={styles.form}>
            <CustomInput
              label="Tên đăng nhập"
              value={userName}
              onChangeText={(text) => {
                setUserName(text);
                setErrors((prev) => ({ ...prev, userName: undefined }));
              }}
              error={errors.userName}
              placeholder="Nhập tên đăng nhập"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <CustomInput
              label="Mật khẩu"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              placeholder="Nhập mật khẩu"
              isPassword
            />

            <TouchableOpacity
              onPress={() => router.push("/auth/forgot-password")}
              style={styles.forgot}
            >
              <Text style={styles.link}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <CustomButton title="Đăng nhập" onPress={handleLogin} loading={submitting} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push("/auth/register")}>
              <Text style={styles.link}>Đăng ký</Text>
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
    justifyContent: "center",
    padding: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  logoWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
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
  },
  form: {
    marginBottom: Spacing.xl,
  },
  forgot: {
    alignSelf: "flex-start",
    marginBottom: Spacing.xl,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
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
