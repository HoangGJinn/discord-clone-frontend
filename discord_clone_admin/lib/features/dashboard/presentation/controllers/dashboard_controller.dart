import 'package:discord_clone_admin/features/admin/data/services/admin_api_service.dart';
import 'package:flutter/foundation.dart';

class DashboardStats {
  final int totalUsers;
  final int activeUsers;
  final int totalServers;
  final int totalMessages;
  final int totalRevenue;
  final int dailyActiveUsers;
  final int newUsersToday;
  final int totalReports;
  final int pendingReports;

  const DashboardStats({
    required this.totalUsers,
    required this.activeUsers,
    required this.totalServers,
    required this.totalMessages,
    required this.totalRevenue,
    required this.dailyActiveUsers,
    required this.newUsersToday,
    required this.totalReports,
    required this.pendingReports,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      totalUsers: json['totalUsers'] as int? ?? 0,
      activeUsers: json['activeUsers'] as int? ?? 0,
      totalServers: json['totalServers'] as int? ?? 0,
      totalMessages: json['totalMessages'] as int? ?? 0,
      totalRevenue: json['totalRevenue'] as int? ?? 0,
      dailyActiveUsers: json['dailyActiveUsersToday'] as int? ?? 0,
      newUsersToday: json['newUsersToday'] as int? ?? 0,
      totalReports: json['totalReports'] as int? ?? 0,
      pendingReports: json['pendingReports'] as int? ?? 0,
    );
  }
}

class DashboardController extends ChangeNotifier {
  final AdminApiService _apiService;

  DashboardStats? stats;
  List<dynamic> userGrowth = [];
  List<dynamic> topServers = [];
  bool isLoading = false;
  String? error;

  DashboardController({AdminApiService? apiService})
      : _apiService = apiService ?? AdminApiService();

  Future<void> loadStats() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      final futures = await Future.wait([
        _apiService.getOverviewStats(),
        _apiService.getUserGrowth(),
        _apiService.getTopServers(),
      ]);
      
      stats = DashboardStats.fromJson(futures[0] as Map<String, dynamic>);
      userGrowth = futures[1] as List<dynamic>;
      topServers = futures[2] as List<dynamic>;
      
      error = null;
    } catch (e) {
      error = e.toString();
      stats = null;
      userGrowth = [];
      topServers = [];
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
