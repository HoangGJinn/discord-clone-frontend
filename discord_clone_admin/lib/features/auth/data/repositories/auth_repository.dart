import 'package:discord_clone_admin/core/network/api_client.dart';
import 'package:discord_clone_admin/core/network/api_exception.dart';
import 'package:discord_clone_admin/features/auth/domain/entities/auth_session.dart';
import 'package:discord_clone_admin/features/auth/domain/entities/login_credentials.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthRepository {
  AuthRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  final ApiClient _apiClient;

  static const String _tokenKey = 'auth_token';
  static const String _userIdKey = 'auth_user_id';
  static const String _userNameKey = 'auth_user_name';

  Future<AuthSession> login(LoginCredentials credentials) async {
    final loginData = await _apiClient.post('/auth/login', {
      'userName': credentials.userName,
      'password': credentials.password,
    });

    final token = loginData['token']?.toString() ?? '';
    final userIdRaw = loginData['userId'];
    final userName = loginData['userName']?.toString() ?? '';
    final message = loginData['message']?.toString() ?? 'Đăng nhập thành công';

    if (token.isEmpty || userName.isEmpty || userIdRaw == null) {
      throw ApiException('Phản hồi đăng nhập không hợp lệ');
    }

    final userId = userIdRaw is int ? userIdRaw : int.tryParse(userIdRaw.toString());
    if (userId == null) {
      throw ApiException('Không đọc được userId từ backend');
    }

    final profileData = await _apiClient.get('/users/me', bearerToken: token);
    final rolesRaw = profileData['roles'];
    final roles = rolesRaw is List ? rolesRaw.map((role) => role.toString()).toList() : <String>[];

    if (!roles.contains('ADMIN')) {
      throw ApiException('Tài khoản không có quyền ADMIN để đăng nhập trang quản trị');
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setInt(_userIdKey, userId);
    await prefs.setString(_userNameKey, userName);

    return AuthSession(
      token: token,
      userId: userId,
      userName: userName,
      message: message,
    );
  }
}
