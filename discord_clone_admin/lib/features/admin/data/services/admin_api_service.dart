import 'package:discord_clone_admin/core/network/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AdminApiService {
  static const String _tokenKey = 'auth_token';
  final ApiClient _apiClient;

  AdminApiService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  // Get stored token
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  // ===== STATS =====

  Future<Map<String, dynamic>> getOverviewStats() async {
    final token = await _getToken();
    return await _apiClient.get('/admin/stats/overview', bearerToken: token);
  }

  Future<List<dynamic>> getUserGrowth({String? from, String? to}) async {
    final token = await _getToken();
    final queryParams = <String, String>{};
    if (from != null) queryParams['from'] = from;
    if (to != null) queryParams['to'] = to;
    return (await _apiClient.get('/admin/stats/user-growth', bearerToken: token, queryParameters: queryParams)) as List<dynamic>? ?? [];
  }

  Future<List<dynamic>> getTopServers({int limit = 10}) async {
    final token = await _getToken();
    final queryParams = <String, String>{'limit': limit.toString()};
    return (await _apiClient.get('/admin/stats/top-servers', bearerToken: token, queryParameters: queryParams)) as List<dynamic>? ?? [];
  }

  // ===== USER MANAGEMENT =====

  Future<Map<String, dynamic>> getAllUsers({
    String? search,
    bool? active,
    int page = 0,
    int size = 20,
  }) async {
    final token = await _getToken();
    final queryParams = <String, String>{
      'page': page.toString(),
      'size': size.toString(),
    };
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (active != null) queryParams['active'] = active.toString();

    // Need to implement query param support in ApiClient get method
    return await _apiClient.get('/admin/users', bearerToken: token);
  }

  Future<void> disableUser(int userId) async {
    final token = await _getToken();
    await _apiClient.put('/admin/users/$userId/disable', {}, bearerToken: token);
  }

  Future<void> enableUser(int userId) async {
    final token = await _getToken();
    await _apiClient.put('/admin/users/$userId/enable', {}, bearerToken: token);
  }

  Future<void> banUser(int userId, String reason) async {
    final token = await _getToken();
    await _apiClient.put('/admin/users/$userId/ban?reason=$reason', {}, bearerToken: token);
  }

  Future<void> unbanUser(int userId) async {
    final token = await _getToken();
    await _apiClient.put('/admin/users/$userId/unban', {}, bearerToken: token);
  }

  // ===== SERVER MANAGEMENT =====

  Future<Map<String, dynamic>> getAllServers({
    String? search,
    int page = 0,
    int size = 20,
  }) async {
    final token = await _getToken();
    final queryParams = <String, String>{
      'page': page.toString(),
      'size': size.toString(),
    };
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    return await _apiClient.get('/admin/servers', bearerToken: token);
  }

  Future<void> deleteServer(int serverId) async {
    final token = await _getToken();
    await _apiClient.delete('/admin/servers/$serverId', bearerToken: token);
  }

  // ===== REPORTED MESSAGES =====

  Future<List<dynamic>> getReports({String? status}) async {
    final token = await _getToken();
    final query = status != null ? '?status=$status' : '';
    final response = await _apiClient.get('/admin/reports$query', bearerToken: token);
    return response['content'] as List<dynamic>? ?? [];
  }

  Future<Map<String, dynamic>> getReportDetail(int reportId) async {
    final token = await _getToken();
    return await _apiClient.get('/admin/reports/$reportId', bearerToken: token);
  }

  Future<void> resolveReport(int reportId, String action) async {
    final token = await _getToken();
    await _apiClient.put('/admin/reports/$reportId/resolve', {
      'action': action,
    }, bearerToken: token);
  }

  Future<void> deleteReport(int reportId) async {
    final token = await _getToken();
    await _apiClient.delete('/admin/reports/$reportId', bearerToken: token);
  }

  // ===== MODERATION ACTIONS =====

  Future<void> deleteMessage(String messageId) async {
    final token = await _getToken();
    await _apiClient.delete('/admin/messages/$messageId', bearerToken: token);
  }

  Future<void> warnUser(int userId, String reason) async {
    final token = await _getToken();
    await _apiClient.post('/admin/users/$userId/warn?reason=$reason', {}, bearerToken: token);
  }

  Future<void> banUserPermanent(int userId, String reason) async {
    final token = await _getToken();
    await _apiClient.put('/admin/users/$userId/ban-permanent?reason=$reason', {}, bearerToken: token);
  }

  // ===== BLACKLIST =====

  Future<dynamic> getBlacklist() async {
    final token = await _getToken();
    return await _apiClient.get('/admin/moderation/blacklist', bearerToken: token);
  }

  Future<Map<String, dynamic>> addBlacklistKeyword(String keyword) async {
    final token = await _getToken();
    return await _apiClient.post('/admin/moderation/blacklist', {
      'keyword': keyword,
    }, bearerToken: token);
  }

  Future<void> removeBlacklistKeyword(int blacklistId) async {
    final token = await _getToken();
    await _apiClient.delete('/admin/moderation/blacklist/$blacklistId', bearerToken: token);
  }

  // ===== NITRO PAYMENT ADMIN =====

  Future<Map<String, dynamic>> getNitroOrders({
    String? status,
    String? search,
    int page = 0,
    int size = 20,
  }) async {
    final token = await _getToken();
    final queryParams = <String, String>{
      'page': page.toString(),
      'size': size.toString(),
      'sort': 'createdAt,desc',
    };
    if (status != null && status.isNotEmpty) queryParams['status'] = status;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    return await _apiClient.get('/admin/payment/orders', bearerToken: token, queryParameters: queryParams);
  }

  Future<Map<String, dynamic>> getNitroOrderDetail(String txnRef) async {
    final token = await _getToken();
    return await _apiClient.get('/admin/payment/orders/$txnRef', bearerToken: token);
  }

  Future<void> approveOrder(String txnRef) async {
    final token = await _getToken();
    await _apiClient.put('/admin/payment/orders/$txnRef/approve', {}, bearerToken: token);
  }

  Future<void> rejectOrder(String txnRef) async {
    final token = await _getToken();
    await _apiClient.put('/admin/payment/orders/$txnRef/reject', {}, bearerToken: token);
  }

  Future<Map<String, dynamic>> getRevenueStats() async {
    final token = await _getToken();
    return await _apiClient.get('/admin/payment/stats', bearerToken: token);
  }

  // ===== AUDIT LOGS =====

  Future<Map<String, dynamic>> getAuditLogs({
    String? action,
    int? adminId,
    String? targetType,
    int page = 0,
    int size = 20,
  }) async {
    final token = await _getToken();
    final queryParams = <String, String>{
      'page': page.toString(),
      'size': size.toString(),
      'sort': 'createdAt,desc',
    };
    if (action != null && action.isNotEmpty) queryParams['action'] = action;
    if (adminId != null) queryParams['adminId'] = adminId.toString();
    if (targetType != null && targetType.isNotEmpty) queryParams['targetType'] = targetType;

    return await _apiClient.get('/admin/audit-logs', bearerToken: token, queryParameters: queryParams);
  }

  Future<Map<String, dynamic>> getAuditLogDetail(int logId) async {
    final token = await _getToken();
    return await _apiClient.get('/admin/audit-logs/$logId', bearerToken: token);
  }
}
