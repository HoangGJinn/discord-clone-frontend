import { CustomButton } from "@/components/auth/CustomButton";
import { CustomInput } from "@/components/auth/CustomInput";
import { DiscordColors, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { makeRedirectUri } from "expo-auth-session";
import React, { useEffect, useState } from "react";

WebBrowser.maybeCompleteAuthSession();
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
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: "443048255847-fpd4dgb1qp35ru0lhn59tvdem8jkobv8.apps.googleusercontent.com",
    redirectUri: makeRedirectUri({
      useProxy: true,
    }),
  });

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ userName?: string; password?: string }>({});

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    console.log("--- Google Auth Response ---");
    console.log("Type:", response?.type);
    if (response?.type === "error") {
      console.log("Error details:", response.error);
    }

    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setSubmitting(true);
    try {
      await loginWithGoogle(idToken);
    } catch (error) {
      Alert.alert("Lỗi", error instanceof Error ? error.message : "Đăng nhập Google thất bại");
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleGoogleLoginPress = async () => {
    setSubmitting(true);
    try {
      console.log("--- GOOGLE OFFICIAL PROXY START ---");
      const result = await promptAsync({ useProxy: true });

      console.log("--- Google Auth Result ---");
      console.log(result);

      if (result?.type === "success") {
        const { id_token } = result.params;
        handleGoogleLogin(id_token);
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      Alert.alert("Lỗi", "Không thể đăng nhập bằng Google");
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

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLoginPress}
              disabled={submitting}
            >
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
            </TouchableOpacity>
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DiscordColors.divider,
  },
  dividerText: {
    color: DiscordColors.textMuted,
    marginHorizontal: Spacing.md,
    fontSize: 13,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#df4b3b", // Google Red
    borderRadius: 12,
    paddingVertical: 12,
    gap: Spacing.sm,
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
