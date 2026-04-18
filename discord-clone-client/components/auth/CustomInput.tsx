import { DiscordColors, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface CustomInputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  isPassword = false,
  containerStyle,
  inputStyle,
  ...props
}) => {
  const [focused, setFocused] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            focused && styles.inputFocused,
            error && styles.inputError,
            isPassword && styles.inputHasIcon,
            inputStyle,
          ]}
          placeholderTextColor={DiscordColors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={DiscordColors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  label: {
    color: DiscordColors.textSecondary,
    marginBottom: Spacing.xs,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  labelError: {
    color: DiscordColors.red,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    backgroundColor: DiscordColors.inputBackground,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    borderRadius: 8,
    color: DiscordColors.textPrimary,
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  inputFocused: {
    borderColor: DiscordColors.blurple,
  },
  inputError: {
    borderColor: DiscordColors.red,
  },
  inputHasIcon: {
    paddingRight: 46,
  },
  eyeButton: {
    position: "absolute",
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  errorText: {
    color: DiscordColors.red,
    marginTop: Spacing.xs,
    fontSize: 12,
  },
});

export default CustomInput;
