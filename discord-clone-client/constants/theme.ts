import { Platform } from 'react-native';

export const DiscordColors = {
  // Background colors
  primaryBackground: '#313338',
  secondaryBackground: '#2B2D31',
  tertiaryBackground: '#1E1F22',
  quaternaryBackground: '#232428',
  
  // Accent colors
  blurple: '#5865F2',
  blurpleHover: '#4752C4',
  green: '#23A559',
  yellow: '#F2A31A',
  red: '#F23F43',
  
  // Text colors
  textPrimary: '#F2F3F5',
  textSecondary: '#B5BAC1',
  textMuted: '#949BA4',
  textLink: '#00A8FC',
  
  // Miscellaneous
  divider: '#3F4147',
  cardBackground: '#383A40',
  inputBackground: '#1E1F22',
};

export const Colors = {
  light: {
    text: '#11181C',
    background: '#ffffff',
    tint: DiscordColors.blurple,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: DiscordColors.blurple,
    card: '#f5f5f5',
    border: '#e1e1e1',
  },
  dark: {
    text: DiscordColors.textPrimary,
    background: DiscordColors.primaryBackground,
    tint: DiscordColors.blurple,
    icon: DiscordColors.textSecondary,
    tabIconDefault: DiscordColors.textMuted,
    tabIconSelected: '#ffffff',
    card: DiscordColors.secondaryBackground,
    border: DiscordColors.divider,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    mono: 'Courier',
  },
  android: {
    sans: 'Roboto',
    mono: 'monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
});
