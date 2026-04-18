import 'package:discord_clone_admin/app/admin_shell.dart';
import 'package:discord_clone_admin/core/theme/app_theme.dart';
import 'package:discord_clone_admin/features/auth/presentation/screens/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AdminApp extends StatelessWidget {
  const AdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Discord Clone Admin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      initialRoute: '/login',
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/login':
            return MaterialPageRoute(builder: (_) => const LoginScreen());
          case '/shell':
            final adminName = (settings.arguments as String?) ?? 'Admin';
            return PageRouteBuilder(
              settings: settings,
              pageBuilder: (_, __, ___) => AdminShell(adminName: adminName),
              transitionsBuilder: (_, anim, __, child) => FadeTransition(opacity: anim, child: child),
              transitionDuration: const Duration(milliseconds: 300),
            );
          default:
            return MaterialPageRoute(builder: (_) => const LoginScreen());
        }
      },
    );
  }
}

/// Check if already logged in → go straight to shell
Future<Widget> resolveStartup() async {
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('auth_token') ?? '';
  final displayName = prefs.getString('auth_display_name');
  final roles = prefs.getStringList('auth_roles') ?? [];

  if (token.isNotEmpty && roles.contains('ADMIN')) {
    return AdminShell(adminName: displayName ?? 'Admin');
  }
  return const LoginScreen();
}

