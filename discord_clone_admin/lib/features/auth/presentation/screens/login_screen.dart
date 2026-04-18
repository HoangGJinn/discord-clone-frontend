import 'package:discord_clone_admin/core/theme/app_colors.dart';
import 'package:discord_clone_admin/core/theme/app_spacing.dart';
import 'package:discord_clone_admin/features/auth/presentation/controllers/login_controller.dart';
import 'package:discord_clone_admin/features/auth/data/repositories/auth_repository.dart';
import 'package:discord_clone_admin/shared/widgets/app_text_field.dart';
import 'package:discord_clone_admin/shared/widgets/primary_button.dart';
import 'package:flutter/material.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _controller = LoginController();
  final _userNameController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    _userNameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final userName = _userNameController.text.trim();
    final result = await _controller.login(
      userName: userName,
      password: _passwordController.text,
    );

    if (!mounted) return;

    if (result.success) {
      // Lấy displayName từ AuthRepository
      final authRepo = AuthRepository();
      final displayName = await authRepo.getDisplayName();
      final nameToShow = displayName ?? userName;

      // Navigate to AdminShell, passing the admin's display name
      Navigator.of(context).pushReplacementNamed(
        '/shell',
        arguments: nameToShow,
      );
      return;
    }

    if (result.message != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message!),
          backgroundColor: AppColors.danger,
          behavior: SnackBarBehavior.floating,
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            return Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const _LoginHeader(),
                      const SizedBox(height: AppSpacing.xxl),
                      AppTextField(
                        label: 'Tên đăng nhập',
                        controller: _userNameController,
                        hintText: 'Nhập tên đăng nhập',
                        errorText: _controller.userNameError,
                        onChanged: (_) => _controller.clearUserNameError(),
                      ),
                      AppTextField(
                        label: 'Mật khẩu',
                        controller: _passwordController,
                        hintText: 'Nhập mật khẩu',
                        errorText: _controller.passwordError,
                        obscureText: true,
                        onChanged: (_) => _controller.clearPasswordError(),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton(
                          onPressed: () {},
                          style: TextButton.styleFrom(padding: EdgeInsets.zero),
                          child: const Text(
                            'Quên mật khẩu?',
                            style: TextStyle(
                              color: AppColors.textLink,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      PrimaryButton(
                        title: 'Đăng nhập',
                        loading: _controller.isSubmitting,
                        onPressed: _handleLogin,
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      const Text(
                        'Tài khoản admin được cấp bởi hệ thống.\nLiên hệ quản trị viên nếu bạn chưa có tài khoản.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _LoginHeader extends StatelessWidget {
  const _LoginHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        CircleAvatar(
          radius: 41,
          backgroundColor: AppColors.surface,
          child: Icon(
            Icons.admin_panel_settings_rounded,
            size: 42,
            color: AppColors.blurple,
          ),
        ),
        SizedBox(height: AppSpacing.lg),
        Text(
          'Admin Panel',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 28,
            fontWeight: FontWeight.w800,
          ),
        ),
        SizedBox(height: AppSpacing.xs),
        Text(
          'Đăng nhập để quản lý hệ thống',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 15,
          ),
        ),
      ],
    );
  }
}
