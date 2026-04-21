import 'package:discord_clone_admin/features/admin/data/services/admin_api_service.dart';
import 'package:flutter/foundation.dart';

class RevenueOrder {
  final String orderId;
  final String user;
  final String type;
  final double amount;
  final String status;
  final String time;
  final String txnRef;

  RevenueOrder({
    required this.orderId,
    required this.user,
    required this.type,
    required this.amount,
    required this.status,
    required this.time,
    required this.txnRef,
  });

  factory RevenueOrder.fromJson(Map<String, dynamic> json) {
    final createdAt = json['createdAt'] ?? '';
    String timeAgo = createdAt.toString();
    try {
      final dt = DateTime.parse(createdAt);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) {
        timeAgo = '${diff.inMinutes} phút trước';
      } else if (diff.inHours < 24) {
        timeAgo = '${diff.inHours} giờ trước';
      } else {
        timeAgo = '${diff.inDays} ngày trước';
      }
    } catch (_) {}

    return RevenueOrder(
      orderId: json['txnRef'] ?? 'N/A',
      user: json['userName'] ?? 'Unknown',
      type: (json['amount'] ?? 0) >= 99000 ? 'Nitro Boost' : 'Nitro Classic',
      amount: (json['amount'] ?? 0).toDouble(),
      status: json['status'] ?? 'UNKNOWN',
      time: timeAgo,
      txnRef: json['txnRef'] ?? '',
    );
  }
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

  factory RevenueStats.fromJson(Map<String, dynamic> json) {
    return RevenueStats(
      totalRevenue: (json['totalRevenue'] ?? 0).toDouble(),
      totalOrders: (json['totalOrders'] ?? 0).toInt(),
      successRate: (json['successRate'] ?? 0).toDouble(),
      successCount: (json['successCount'] ?? 0).toInt(),
      pendingCount: (json['pendingCount'] ?? 0).toInt(),
      failedCount: (json['failedCount'] ?? 0).toInt(),
    );
  }
}

class RevenueController extends ChangeNotifier {
  final AdminApiService _apiService;

  List<RevenueOrder> _orders = [];
  RevenueStats? _stats;
  bool isLoading = false;
  String? error;
  String? _statusFilter;
  int _currentPage = 0;
  int _totalPages = 0;
  bool hasMore = true;

  RevenueController({AdminApiService? apiService})
      : _apiService = apiService ?? AdminApiService();

  List<RevenueOrder> get orders => _orders;
  RevenueStats? get stats => _stats;
  String? get statusFilter => _statusFilter;
  int get currentPage => _currentPage;

  Future<void> loadRevenueData({int periodIndex = 1, String? statusFilter}) async {
    isLoading = true;
    error = null;
    _statusFilter = statusFilter;
    _currentPage = 0;
    notifyListeners();

    try {
      // Load stats and orders in parallel
      final statsFuture = _apiService.getRevenueStats();
      final ordersFuture = _apiService.getNitroOrders(status: statusFilter, page: 0, size: 20);
      
      final statsJson = await statsFuture;
      _stats = RevenueStats.fromJson(statsJson);

      final ordersJson = await ordersFuture;
      final content = ordersJson['content'] as List<dynamic>? ?? [];
      _orders = content.map((e) => RevenueOrder.fromJson(e as Map<String, dynamic>)).toList();
      _totalPages = ordersJson['totalPages'] ?? 1;
      hasMore = _currentPage < _totalPages - 1;
    } catch (e) {
      error = e.toString();
      debugPrint('RevenueController error: $e');
      _orders = [];
      _stats = null;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreOrders() async {
    if (!hasMore || isLoading) return;
    _currentPage++;
    try {
      final ordersJson = await _apiService.getNitroOrders(
        status: _statusFilter,
        page: _currentPage,
        size: 20,
      );
      final content = ordersJson['content'] as List<dynamic>? ?? [];
      _orders.addAll(content.map((e) => RevenueOrder.fromJson(e as Map<String, dynamic>)));
      _totalPages = ordersJson['totalPages'] ?? 1;
      hasMore = _currentPage < _totalPages - 1;
      notifyListeners();
    } catch (e) {
      _currentPage--;
      debugPrint('LoadMore error: $e');
    }
  }

  Future<bool> approveOrder(String txnRef) async {
    try {
      await _apiService.approveOrder(txnRef);
      // Refresh data after approve
      await loadRevenueData(statusFilter: _statusFilter);
      return true;
    } catch (e) {
      debugPrint('Approve error: $e');
      return false;
    }
  }

  Future<bool> rejectOrder(String txnRef) async {
    try {
      await _apiService.rejectOrder(txnRef);
      // Refresh data after reject
      await loadRevenueData(statusFilter: _statusFilter);
      return true;
    } catch (e) {
      debugPrint('Reject error: $e');
      return false;
    }
  }
}
