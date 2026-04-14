import 'package:discord_clone_admin/features/auth/domain/entities/login_credentials.dart';

class LoginValidationResult {
  const LoginValidationResult({this.userNameError, this.passwordError});

  final String? userNameError;
  final String? passwordError;

  bool get isValid => userNameError == null && passwordError == null;
}

class ValidateLoginUseCase {
  LoginValidationResult call(LoginCredentials credentials) {
    String? userNameError;
    String? passwordError;

    if (credentials.userName.trim().isEmpty) {
      userNameError = 'Vui lòng nhập tên đăng nhập';
    }

    if (credentials.password.isEmpty) {
      passwordError = 'Vui lòng nhập mật khẩu';
    }

    return LoginValidationResult(
      userNameError: userNameError,
      passwordError: passwordError,
    );
  }
}
