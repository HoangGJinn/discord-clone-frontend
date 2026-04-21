import 'package:discord_clone_admin/features/admin/data/services/admin_api_service.dart';
import 'package:flutter/foundation.dart';

class AuditLogItem {
  final int id;
  final String action;
  final String actor;
  final String target;
  final String time;
  final int type;
  final String? details;
  final String? ipAddress;

  AuditLogItem({
    required this.id,
    required this.action,
    required this.actor,
    required this.target,
    required this.time,
    required this.type,
    this.details,
    this.ipAddress,
  });

  factory AuditLogItem.fromJson(Map<String, dynamic> json) {
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

    // Determine the type based on action string
    final action = json['action']?.toString() ?? '';
    int type = 0; // default "All"
    if (action.contains('USER') || action.contains('WARN') || action.contains('BAN')) {
      type = 1; // User
    } else if (action.contains('SERVER')) {
      type = 2; // Server
    } else if (action.contains('ORDER') || action.contains('PAYMENT') || action.contains('APPROVE') || action.contains('REJECT')) {
      type = 3; // Payment
    } else if (action.contains('CONFIG') || action.contains('SYSTEM')) {
      type = 4; // System
    } else if (action.contains('DELETE') || action.contains('DANGER')) {
      type = 5; // Danger
    }

    final targetType = json['targetType']?.toString() ?? '';
    final targetId = json['targetId']?.toString() ?? '';
    final targetStr = targetType.isNotEmpty ? '$targetType#$targetId' : 'N/A';

    return AuditLogItem(
      id: (json['id'] ?? 0).toInt(),
      action: action,
      actor: json['adminName'] ?? 'system',
      target: targetStr,
      time: timeAgo,
      type: type,
      details: json['details'],
      ipAddress: json['ipAddress'],
    );
  }
}

class AuditLogsController extends ChangeNotifier {
  final AdminApiService _apiService;

  List<AuditLogItem> _logs = [];
  bool isLoading = false;
  String? error;
  int totalLogs = 0;
  int _currentPage = 0;
  int _totalPages = 0;
  bool hasMore = true;

  // Filter state
  String? _actionFilter;
  String? _targetTypeFilter;

  AuditLogsController({AdminApiService? apiService})
      : _apiService = apiService ?? AdminApiService();

  List<AuditLogItem> get logs => _logs;

  // Map filter index to targetType value
  static const _filterTypeMap = {
    0: null,        // All
    1: 'USER',      // User
    2: 'SERVER',    // Server
    3: 'NITRO_ORDER', // Payment
    4: null,        // System (filter by action)
    5: 'REPORT',    // Danger
  };

  static const _filterActionMap = {
    4: 'CONFIG',    // System actions contain CONFIG
  };

  Future<void> loadLogs({String? search, int? filterType}) async {
    isLoading = true;
    error = null;
    _currentPage = 0;
    notifyListeners();

    // Map filterType to API params
    _targetTypeFilter = filterType != null && filterType != 0 ? _filterTypeMap[filterType] : null;
    _actionFilter = filterType != null ? _filterActionMap[filterType] : null;

    // If search is provided, use it as action filter
    if (search != null && search.isNotEmpty) {
      _actionFilter = search;
    }

    try {
      final response = await _apiService.getAuditLogs(
        action: _actionFilter,
        targetType: _targetTypeFilter,
        page: 0,
        size: 30,
      );

      final content = response['content'] as List<dynamic>? ?? [];
      _logs = content.map((e) => AuditLogItem.fromJson(e as Map<String, dynamic>)).toList();
      totalLogs = (response['totalElements'] ?? 0).toInt();
      _totalPages = (response['totalPages'] ?? 1).toInt();
      hasMore = _currentPage < _totalPages - 1;
    } catch (e) {
      error = e.toString();
      debugPrint('AuditLogsController error: $e');
      _logs = [];
      totalLogs = 0;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMore() async {
    if (!hasMore || isLoading) return;
    _currentPage++;
    try {
      final response = await _apiService.getAuditLogs(
        action: _actionFilter,
        targetType: _targetTypeFilter,
        page: _currentPage,
        size: 30,
      );
      final content = response['content'] as List<dynamic>? ?? [];
      _logs.addAll(content.map((e) => AuditLogItem.fromJson(e as Map<String, dynamic>)));
      _totalPages = (response['totalPages'] ?? 1).toInt();
      hasMore = _currentPage < _totalPages - 1;
      notifyListeners();
    } catch (e) {
      _currentPage--;
      debugPrint('LoadMore error: $e');
    }
  }
}
