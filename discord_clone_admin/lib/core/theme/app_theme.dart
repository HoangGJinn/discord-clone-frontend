import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.blurple,
        secondary: AppColors.blurpleLight,
        error: AppColors.danger,
        surface: AppColors.surface,
        onPrimary: Colors.white,
        onSurface: AppColors.textPrimary,
        outline: AppColors.border,
      ),
      // ── Text ──────────────────────────────────
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w800,
          fontSize: 32,
          letterSpacing: -0.5,
        ),
        headlineMedium: TextStyle(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w700,
          fontSize: 24,
        ),
        headlineSmall: TextStyle(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w600,
          fontSize: 20,
        ),
        titleLarge: TextStyle(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w600,
          fontSize: 17,
        ),
        titleMedium: TextStyle(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w600,
          fontSize: 15,
        ),
        bodyLarge: TextStyle(color: AppColors.textSecondary, fontSize: 15),
        bodyMedium: TextStyle(color: AppColors.textSecondary, fontSize: 14),
        bodySmall: TextStyle(color: AppColors.textMuted, fontSize: 12),
        labelLarge: TextStyle(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w600,
          fontSize: 14,
          letterSpacing: 0.2,
        ),
      ),
      // ── AppBar ────────────────────────────────
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.navBg,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: AppColors.textPrimary),
        titleTextStyle: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
        ),
      ),
      // ── Card ──────────────────────────────────
      cardTheme: CardThemeData(
        color: AppColors.cardBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      // ── NavigationRail ────────────────────────
      navigationRailTheme: const NavigationRailThemeData(
        backgroundColor: AppColors.navBg,
        selectedIconTheme: IconThemeData(color: AppColors.blurple, size: 22),
        unselectedIconTheme: IconThemeData(color: AppColors.textMuted, size: 22),
        selectedLabelTextStyle: TextStyle(
          color: AppColors.blurple,
          fontWeight: FontWeight.w600,
          fontSize: 11,
        ),
        unselectedLabelTextStyle: TextStyle(
          color: AppColors.textMuted,
          fontSize: 11,
        ),
        indicatorColor: Color(0x265865F2),
        elevation: 0,
        labelType: NavigationRailLabelType.all,
        groupAlignment: -1,
        minWidth: 80,
        minExtendedWidth: 220,
      ),
      // ── NavigationBar (bottom) ────────────────
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.navBg,
        indicatorColor: const Color(0x265865F2),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.blurple, size: 22);
          }
          return const IconThemeData(color: AppColors.textMuted, size: 22);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              color: AppColors.blurple,
              fontWeight: FontWeight.w600,
              fontSize: 11,
            );
          }
          return const TextStyle(color: AppColors.textMuted, fontSize: 11);
        }),
        elevation: 0,
        height: 72,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),
      // ── Divider ───────────────────────────────
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 0,
      ),
      // ── Input ─────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.inputBackground,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.blurple, width: 2),
        ),
        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
      ),
      // ── Chip ──────────────────────────────────
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surface,
        selectedColor: const Color(0x265865F2),
        labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        secondaryLabelStyle: const TextStyle(color: AppColors.blurple, fontSize: 13, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.border),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
      // ── Elevated Button ───────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.blurple,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      // ── Icon ──────────────────────────────────
      iconTheme: const IconThemeData(color: AppColors.textSecondary, size: 20),
    );
  }

  // backward-compat alias
  static ThemeData get light => dark;

  const AppTheme._();
}
