import 'package:discord_clone_admin/features/admin/data/services/admin_api_service.dart';
import 'package:flutter/foundation.dart';

class RevenueOrder {
  final String orderId;
  final String user;
  final String type;
  final double amount;
  final String status;
  final String time;

  RevenueOrder({
    required this.orderId,
    required this.user,
    required this.type,
    required this.amount,
    required this.status,
    required this.time,
  });
}

class RevenueStats {
  final double totalRevenue;
  final int totalOrders;
  final double successRate;

  final int successCount;
  final int pendingCount;
  final int failedCount;

  RevenueStats({
    required this.totalRevenue,
    required this.totalOrders,
    required this.successRate,
    required this.successCount,
    required this.pendingCount,
    required this.failedCount,
  });
}

class RevenueController extends ChangeNotifier {
  final AdminApiService _apiService;

  List<RevenueOrder> _orders = [];
  RevenueStats? _stats;
  bool isLoading = false;
  String? error;

  RevenueController({AdminApiService? apiService})
      : _apiService = apiService ?? AdminApiService();

  List<RevenueOrder> get orders => _orders;
  RevenueStats? get stats => _stats;

  Future<void> loadRevenueData({int periodIndex = 1}) async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      // Simulate API call
      await Future.delayed(const Duration(milliseconds: 700));

      // Fake data depending on period
      // 0=Today, 1=Weekly, 2=Monthly
      double multiplier = periodIndex == 0 ? 1 : (periodIndex == 1 ? 7 : 30);

      _stats = RevenueStats(
        totalRevenue: 2500000 * multiplier,
        totalOrders: (15 * multiplier).toInt(),
        successRate: 98.5,
        successCount: (14 * multiplier).toInt(),
        pendingCount: (1 * multiplier).toInt(),
        failedCount: 0,
      );

      _orders = List.generate(8, (index) => RevenueOrder(
        orderId: 'TXN${1000 + index + (periodIndex * 100)}',
        user: 'user${index}@mail.com',
        type: index % 3 == 0 ? 'Nitro Classic' : 'Nitro Boost',
        amount: index % 3 == 0 ? 49000 : 99000,
        status: index == 0 ? 'PENDING' : (index == 7 ? 'FAILED' : 'SUCCESS'),
        time: '${index + 1} giờ trước',
      ));
      
    } catch (e) {
      error = e.toString();
      _orders = [];
      _stats = null;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
