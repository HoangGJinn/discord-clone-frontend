import 'package:discord_clone_admin/features/admin/data/services/admin_api_service.dart';
import 'package:flutter/foundation.dart';

class AuditLogItem {
  final String action;
  final String actor;
  final String target;
  final String time;
  final int type;

  AuditLogItem({
    required this.action,
    required this.actor,
    required this.target,
    required this.time,
    required this.type,
  });
}

class AuditLogsController extends ChangeNotifier {
  final AdminApiService _apiService;

  List<AuditLogItem> _logs = [];
  bool isLoading = false;
  String? error;
  int totalLogs = 0;

  AuditLogsController({AdminApiService? apiService})
      : _apiService = apiService ?? AdminApiService();

  List<AuditLogItem> get logs => _logs;

  Future<void> loadLogs({String? search, int? filterType}) async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      // Simulate API call
      await Future.delayed(const Duration(milliseconds: 600));

      final allFakeLogs = [
        AuditLogItem(action: 'USER_BANNED', actor: 'admin', target: 'user#1234', time: '2 phút trước', type: 4),
        AuditLogItem(action: 'SERVER_DELETED', actor: 'admin', target: '"Old Server"', time: '15 phút trước', type: 2),
        AuditLogItem(action: 'USER_ROLE_CHANGED', actor: 'superadmin', target: 'user#5678', time: '32 phút trước', type: 1),
        AuditLogItem(action: 'PAYMENT_APPROVED', actor: 'system', target: 'Order #TXN001', time: '1 giờ trước', type: 3),
        AuditLogItem(action: 'USER_CREATED', actor: 'system', target: 'newuser@mail.com', time: '1 giờ trước', type: 1),
        AuditLogItem(action: 'CONFIG_UPDATED', actor: 'admin', target: 'spam_threshold=5', time: '2 giờ trước', type: 4),
        AuditLogItem(action: 'SERVER_WARNED', actor: 'admin', target: '"Toxic Server"', time: '3 giờ trước', type: 5),
        AuditLogItem(action: 'PAYMENT_FAILED', actor: 'system', target: 'Order #TXN002', time: '4 giờ trước', type: 3),
        AuditLogItem(action: 'USER_DISABLED', actor: 'admin', target: 'user#9999', time: '5 giờ trước', type: 1),
        AuditLogItem(action: 'SERVER_CREATED', actor: 'system', target: '"New Server"', time: '6 giờ trước', type: 2),
      ];

      List<AuditLogItem> filtered = List.from(allFakeLogs);
      
      if (search != null && search.isNotEmpty) {
        filtered = filtered.where((l) => 
          l.action.toLowerCase().contains(search.toLowerCase()) || 
          l.actor.toLowerCase().contains(search.toLowerCase()) || 
          l.target.toLowerCase().contains(search.toLowerCase())).toList();
      }

      if (filterType != null && filterType != 0) {
        // Assume filterType 1=User, 2=Server, 3=Payment, 4=System, 5=Danger matches our fake types
        filtered = filtered.where((l) => l.type == filterType || (filterType == 4 && (l.type == 4 || l.type == 5))).toList();
      }

      _logs = filtered;
      totalLogs = 1530; // fake total
    } catch (e) {
      error = e.toString();
      _logs = [];
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
