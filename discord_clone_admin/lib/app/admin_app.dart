import 'package:discord_clone_admin/core/theme/app_theme.dart';
import 'package:discord_clone_admin/features/auth/presentation/screens/login_screen.dart';
import 'package:flutter/material.dart';

class AdminApp extends StatelessWidget {
  const AdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Discord Clone Admin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const LoginScreen(),
    );
  }
}
