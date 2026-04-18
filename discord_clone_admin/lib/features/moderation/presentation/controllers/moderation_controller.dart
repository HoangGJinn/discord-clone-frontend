import 'package:discord_clone_admin/features/admin/data/services/admin_api_service.dart';
import 'package:flutter/foundation.dart';

class ReportedMessageItem {
  final int reportId;
  final String messageId;
  final int reportedByUserId;
  final String reportedByUserName;
  final String messageContent;
  final String channelName;
  final String serverName;
  final String reason;
  final String description;
  final String status;
  final int? reviewedByAdminId;
  final String? reviewedByAdminName;
  final DateTime? reviewedAt;
  final DateTime createdAt;

  ReportedMessageItem({
    required this.reportId,
    required this.messageId,
    required this.reportedByUserId,
    required this.reportedByUserName,
    required this.messageContent,
    required this.channelName,
    required this.serverName,
    required this.reason,
    required this.description,
    required this.status,
    this.reviewedByAdminId,
    this.reviewedByAdminName,
    this.reviewedAt,
    required this.createdAt,
  });

  factory ReportedMessageItem.fromJson(Map<String, dynamic> json) {
    return ReportedMessageItem(
      reportId: json['reportId'] as int? ?? json['id'] as int? ?? 0,
      messageId: json['messageId']?.toString() ?? '',
      reportedByUserId: json['reportedByUserId'] as int? ?? 0,
      reportedByUserName: json['reportedByUserName']?.toString() ?? '',
      messageContent: json['messageContent']?.toString() ?? '',
      channelName: json['channelName']?.toString() ?? '',
      serverName: json['serverName']?.toString() ?? '',
      reason: json['reason']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      status: json['status']?.toString() ?? 'PENDING',
      reviewedByAdminId: json['reviewedByAdminId'] as int?,
      reviewedByAdminName: json['reviewedByAdminName']?.toString(),
      reviewedAt: DateTime.tryParse(json['reviewedAt']?.toString() ?? ''),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class ModerationController extends ChangeNotifier {
  final AdminApiService _apiService;

  List<ReportedMessageItem> _reports = [];
  bool isLoading = false;
  String? error;
  String _selectedFilter = 'PENDING';

  ModerationController({AdminApiService? apiService})
      : _apiService = apiService ?? AdminApiService();

  List<ReportedMessageItem> get reports => _reports;
  String get selectedFilter => _selectedFilter;

  Future<void> loadReports({String? status}) async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      final response = await _apiService.getReports(status: status ?? _selectedFilter);
      if (response is List) {
        _reports = response.map((r) => ReportedMessageItem.fromJson(r as Map<String, dynamic>)).toList();
      } else {
        _reports = [];
      }
    } catch (e) {
      error = e.toString();
      _reports = [];
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> resolveReport(int reportId, String action) async {
    try {
      await _apiService.resolveReport(reportId, action);
      await loadReports();
    } catch (e) {
      error = e.toString();
      notifyListeners();
    }
  }

  Future<void> deleteReport(int reportId) async {
    try {
      await _apiService.deleteReport(reportId);
      await loadReports();
    } catch (e) {
      error = e.toString();
      notifyListeners();
    }
  }

  void setFilter(String filter) {
    _selectedFilter = filter;
    notifyListeners();
    loadReports();
  }
}
