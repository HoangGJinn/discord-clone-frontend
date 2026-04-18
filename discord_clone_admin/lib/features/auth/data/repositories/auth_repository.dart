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
  static const String _displayNameKey = 'auth_display_name';
  static const String _rolesKey = 'auth_roles';

  Future<AuthSession> login(LoginCredentials credentials) async {
    try {
      final loginData = await _apiClient.post('/admin/login', {
        'username': credentials.userName,
        'password': credentials.password,
      });

      final token = loginData['token']?.toString() ?? '';
      final userIdRaw = loginData['userId'];
      final userName = loginData['userName']?.toString() ?? '';
      final email = loginData['email']?.toString() ?? '';
      final displayName = loginData['displayName']?.toString() ?? userName;
      final message = loginData['message']?.toString() ?? 'Đăng nhập thành công';

      // Parse roles
      final rolesRaw = loginData['roles'];
      List<String> roles = [];
      if (rolesRaw is List) {
        roles = rolesRaw.map((r) => r.toString()).toList();
      } else if (rolesRaw is String) {
        roles = [rolesRaw];
      }

      if (token.isEmpty || userName.isEmpty || userIdRaw == null) {
        throw ApiException('Phản hồi đăng nhập không hợp lệ: token hoặc userId trống');
      }

      final userId = userIdRaw is int ? userIdRaw : int.tryParse(userIdRaw.toString());
      if (userId == null) {
        throw ApiException('Không đọc được userId từ backend');
      }

      // Check ADMIN role
      if (!roles.contains('ADMIN')) {
        throw ApiException('Tài khoản không có quyền ADMIN để đăng nhập trang quản trị');
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
      await prefs.setInt(_userIdKey, userId);
      await prefs.setString(_userNameKey, userName);
      await prefs.setString(_displayNameKey, displayName);
      await prefs.setStringList(_rolesKey, roles);

      return AuthSession(
        token: token,
        userId: userId,
        userName: userName,
        displayName: displayName,
        roles: roles,
        message: message,
      );
    } catch (e) {
      if (e is ApiException) {
        rethrow;
      }
      throw ApiException('Lỗi đăng nhập: ${e.toString()}');
    }
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<int?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_userIdKey);
  }

  Future<String?> getUserName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userNameKey);
  }

  Future<String?> getDisplayName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_displayNameKey);
  }

  Future<List<String>> getRoles() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_rolesKey) ?? [];
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
