import 'package:discord_clone_admin/features/admin/data/services/admin_api_service.dart';
import 'package:flutter/foundation.dart';

class BlacklistKeyword {
  final int id;
  final String keyword;
  final int createdByAdminId;
  final String createdByAdminName;
  final DateTime createdAt;

  BlacklistKeyword({
    required this.id,
    required this.keyword,
    required this.createdByAdminId,
    required this.createdByAdminName,
    required this.createdAt,
  });

  factory BlacklistKeyword.fromJson(Map<String, dynamic> json) {
    return BlacklistKeyword(
      id: json['id'] as int? ?? 0,
      keyword: json['keyword']?.toString() ?? '',
      createdByAdminId: json['createdByAdminId'] as int? ?? 0,
      createdByAdminName: json['createdByAdminName']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class BlacklistController extends ChangeNotifier {
  final AdminApiService _apiService;

  List<BlacklistKeyword> _keywords = [];
  bool isLoading = false;
  String? error;

  BlacklistController({AdminApiService? apiService})
      : _apiService = apiService ?? AdminApiService();

  List<BlacklistKeyword> get keywords => _keywords;

  Future<void> loadBlacklist() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      final response = await _apiService.getBlacklist();
      if (response is List) {
        _keywords = response.map((k) => BlacklistKeyword.fromJson(k as Map<String, dynamic>)).toList();
      } else {
        _keywords = [];
      }
    } catch (e) {
      error = e.toString();
      _keywords = [];
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addKeyword(String keyword) async {
    try {
      final response = await _apiService.addBlacklistKeyword(keyword);
      final newKeyword = BlacklistKeyword.fromJson(response);
      _keywords.add(newKeyword);
      notifyListeners();
    } catch (e) {
      error = e.toString();
      notifyListeners();
    }
  }

  Future<void> removeKeyword(int keywordId) async {
    try {
      await _apiService.removeBlacklistKeyword(keywordId);
      _keywords.removeWhere((k) => k.id == keywordId);
      notifyListeners();
    } catch (e) {
      error = e.toString();
      notifyListeners();
    }
  }
}
