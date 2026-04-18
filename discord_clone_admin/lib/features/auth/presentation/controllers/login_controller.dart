import 'package:discord_clone_admin/features/auth/data/repositories/auth_repository.dart';
import 'package:discord_clone_admin/features/auth/domain/entities/auth_session.dart';
import 'package:discord_clone_admin/features/auth/domain/entities/login_credentials.dart';
import 'package:discord_clone_admin/features/auth/domain/use_cases/validate_login_use_case.dart';
import 'package:flutter/foundation.dart';

class LoginSubmitResult {
  const LoginSubmitResult({required this.success, this.message});

  final bool success;
  final String? message;
}

class LoginController extends ChangeNotifier {
  LoginController({
    AuthRepository? authRepository,
    ValidateLoginUseCase? validateLoginUseCase,
  })  : _authRepository = authRepository ?? AuthRepository(),
        _validateLoginUseCase = validateLoginUseCase ?? ValidateLoginUseCase();

  final AuthRepository _authRepository;
  final ValidateLoginUseCase _validateLoginUseCase;

  String? userNameError;
  String? passwordError;
  bool isSubmitting = false;

  void clearUserNameError() {
    if (userNameError != null) {
      userNameError = null;
      notifyListeners();
    }
  }

  void clearPasswordError() {
    if (passwordError != null) {
      passwordError = null;
      notifyListeners();
    }
  }

  Future<LoginSubmitResult> login({
    required String userName,
    required String password,
  }) async {
    final credentials = LoginCredentials(userName: userName, password: password);
    final validationResult = _validateLoginUseCase(credentials);

    userNameError = validationResult.userNameError;
    passwordError = validationResult.passwordError;
    notifyListeners();

    if (!validationResult.isValid) {
      return const LoginSubmitResult(success: false);
    }

    isSubmitting = true;
    notifyListeners();

    try {
      final session = await _authRepository.login(credentials);
      return LoginSubmitResult(
        success: true,
        message: session.message,
      );
    } catch (error) {
      return LoginSubmitResult(
        success: false,
        message: error is Exception ? error.toString().replaceFirst('Exception: ', '') : 'Đã xảy ra lỗi',
      );
    } finally {
      isSubmitting = false;
      notifyListeners();
    }
  }
}
