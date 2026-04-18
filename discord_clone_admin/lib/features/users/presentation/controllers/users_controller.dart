import 'package:discord_clone_admin/features/admin/data/services/admin_api_service.dart';
import 'package:flutter/foundation.dart';

class AdminUserSummary {
  final int userId;
  final String userName;
  final String displayName;
  final String email;
  final bool isActive;
  final bool isEmailVerified;
  final DateTime createdAt;
  final int serverCount;
  final int friendCount;

  AdminUserSummary({
    required this.userId,
    required this.userName,
    required this.displayName,
    required this.email,
    required this.isActive,
    required this.isEmailVerified,
    required this.createdAt,
    required this.serverCount,
    required this.friendCount,
  });

  factory AdminUserSummary.fromJson(Map<String, dynamic> json) {
    return AdminUserSummary(
      userId: json['userId'] as int? ?? json['id'] as int? ?? 0,
      userName: json['userName']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      isActive: json['isActive'] as bool? ?? true,
      isEmailVerified: json['isEmailVerified'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      serverCount: json['serverCount'] as int? ?? 0,
      friendCount: json['friendCount'] as int? ?? 0,
    );
  }
}

class UsersController extends ChangeNotifier {
  final AdminApiService _apiService;

  List<AdminUserSummary> _users = [];
  bool isLoading = false;
  String? error;
  int _totalUsers = 0;

  UsersController({AdminApiService? apiService})
      : _apiService = apiService ?? AdminApiService();

  List<AdminUserSummary> get users => _users;
  int get totalUsers => _totalUsers;

  Future<void> loadUsers({String? search, bool? active}) async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      // TODO: Handle pagination properly
      final response = await _apiService.getAllUsers(search: search, active: active);
      // Response should be a page with 'content' array and 'totalElements'
      if (response is Map) {
        final content = response['content'] as List?;
        _totalUsers = response['totalElements'] as int? ?? 0;
        if (content != null) {
          _users = content.map((u) => AdminUserSummary.fromJson(u as Map<String, dynamic>)).toList();
        } else {
          _users = [];
        }
      } else {
        _users = [];
      }
    } catch (e) {
      error = e.toString();
      _users = [];
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> disableUser(int userId) async {
    try {
      await _apiService.disableUser(userId);
      await loadUsers();
    } catch (e) {
      error = e.toString();
      notifyListeners();
    }
  }

  Future<void> enableUser(int userId) async {
    try {
      await _apiService.enableUser(userId);
      await loadUsers();
    } catch (e) {
      error = e.toString();
      notifyListeners();
    }
  }

  Future<void> banUser(int userId, String reason) async {
    try {
      await _apiService.banUser(userId, reason);
      await loadUsers();
    } catch (e) {
      error = e.toString();
      notifyListeners();
    }
  }
}
