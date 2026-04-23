import { CustomButton } from "@/components/auth/CustomButton";
import { CustomInput } from "@/components/auth/CustomInput";
import { DiscordColors, Spacing } from "@/constants/theme";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
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

export default function ChangePasswordScreen() {
  const logout = useAuthStore((state) => state.logout);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      nextErrors.currentPassword = "Please enter current password";
    }

    if (!formData.newPassword) {
      nextErrors.newPassword = "Please enter new password";
    } else if (formData.newPassword.length < 6) {
      nextErrors.newPassword = "New password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm new password";
    } else if (formData.confirmPassword !== formData.newPassword) {
      nextErrors.confirmPassword = "Confirm password does not match";
    }

    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      nextErrors.newPassword = "New password must be different from current password";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await authService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmNewPassword: formData.confirmPassword,
      });

      await logout();

      Alert.alert("Success", "Password changed successfully. Please log in again.", [
        {
          text: "Log in",
          onPress: () => router.replace("/auth/login"),
        },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Unable to change password";
      const normalizedMessage = String(message).toLowerCase();

      if (normalizedMessage.includes("current password")) {
        setErrors({ currentPassword: String(message) });
      } else if (normalizedMessage.includes("confirm")) {
        setErrors({ confirmPassword: String(message) });
      } else if (normalizedMessage.includes("new password")) {
        setErrors({ newPassword: String(message) });
      } else {
        Alert.alert("Error", String(message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={DiscordColors.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>Enter current password and new password</Text>
          </View>

          <View style={styles.form}>
            <CustomInput
              label="Current Password"
              placeholder="Enter current password"
              value={formData.currentPassword}
              onChangeText={(text) => updateField("currentPassword", text)}
              error={errors.currentPassword}
              isPassword
            />

            <CustomInput
              label="New Password"
              placeholder="Enter new password"
              value={formData.newPassword}
              onChangeText={(text) => updateField("newPassword", text)}
              error={errors.newPassword}
              isPassword
            />

            <CustomInput
              label="Confirm New Password"
              placeholder="Re-enter new password"
              value={formData.confirmPassword}
              onChangeText={(text) => updateField("confirmPassword", text)}
              error={errors.confirmPassword}
              isPassword
            />

            <CustomButton
              title="Change Password"
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: Spacing.md }}
            />

            <CustomButton
              title="Cancel"
              onPress={() => router.back()}
              style={styles.cancelButton}
              textStyle={styles.cancelText}
            />
          </View>

          <View style={styles.noteContainer}>
            <Ionicons name="information-circle-outline" size={20} color={DiscordColors.textMuted} />
            <Text style={styles.noteText}>
              If you forgot your current password, use the Forgot Password flow.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  backText: {
    color: DiscordColors.textSecondary,
    fontSize: 16,
    marginLeft: Spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: DiscordColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 17,
    color: DiscordColors.textSecondary,
  },
  form: {
    width: "100%",
  },
  cancelButton: {
    marginTop: Spacing.md,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: DiscordColors.divider,
  },
  cancelText: {
    color: DiscordColors.textSecondary,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: Spacing.xxl,
    padding: Spacing.md,
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 15,
    color: DiscordColors.textMuted,
    marginLeft: Spacing.sm,
    lineHeight: 21,
  },
});