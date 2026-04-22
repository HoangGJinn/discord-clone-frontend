import 'package:discord_clone_admin/features/admin/data/services/admin_api_service.dart';
import 'package:flutter/foundation.dart';

class AdminServerSummary {
  final int serverId;
  final String name;
  final String description;
  final String iconUrl;
  final int ownerId;
  final String ownerName;
  final int memberCount;
  final int channelCount;
  final DateTime createdAt;
  final bool isBanned;

  AdminServerSummary({
    required this.serverId,
    required this.name,
    required this.description,
    required this.iconUrl,
    required this.ownerId,
    required this.ownerName,
    required this.memberCount,
    required this.channelCount,
    required this.createdAt,
    required this.isBanned,
  });

  factory AdminServerSummary.fromJson(Map<String, dynamic> json) {
    return AdminServerSummary(
      serverId: json['serverId'] as int? ?? json['id'] as int? ?? 0,
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      iconUrl: json['iconUrl']?.toString() ?? '',
      ownerId: json['ownerId'] as int? ?? 0,
      ownerName: json['ownerName']?.toString() ?? '',
      memberCount: json['memberCount'] as int? ?? 0,
      channelCount: json['channelCount'] as int? ?? 0,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      isBanned: json['banned'] as bool? ?? json['isBanned'] as bool? ?? false,
    );
  }
}

class ServersController extends ChangeNotifier {
  final AdminApiService _apiService;

  List<AdminServerSummary> _servers = [];
  bool isLoading = false;
  String? error;
  int _totalServers = 0;

  ServersController({AdminApiService? apiService})
      : _apiService = apiService ?? AdminApiService();

  List<AdminServerSummary> get servers => _servers;
  int get totalServers => _totalServers;

  Future<void> loadServers({String? search, bool? active}) async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      final response = await _apiService.getAllServers(search: search, active: active);
      final content = response['content'] as List?;
      _totalServers = response['totalElements'] as int? ?? 0;
      if (content != null) {
        _servers = content.map((s) => AdminServerSummary.fromJson(s as Map<String, dynamic>)).toList();
      } else {
        _servers = [];
      }
    } catch (e) {
      error = e.toString();
      _servers = [];
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteServer(int serverId) async {
    try {
      await _apiService.deleteServer(serverId);
      _servers.removeWhere((s) => s.serverId == serverId);
      _totalServers--;
      notifyListeners();
    } catch (e) {
      error = e.toString();
      notifyListeners();
    }
  }

  Future<void> banServer(int serverId, String reason) async {
    try {
      await _apiService.banServer(serverId, reason: reason);
      final index = _servers.indexWhere((s) => s.serverId == serverId);
      if (index != -1) {
        final old = _servers[index];
        _servers[index] = AdminServerSummary(
          serverId: old.serverId,
          name: old.name,
          description: old.description,
          iconUrl: old.iconUrl,
          ownerId: old.ownerId,
          ownerName: old.ownerName,
          memberCount: old.memberCount,
          channelCount: old.channelCount,
          createdAt: old.createdAt,
          isBanned: true,
        );
        notifyListeners();
      }
    } catch (e) {
      error = e.toString();
      notifyListeners();
    }
  }

  Future<void> unbanServer(int serverId) async {
    try {
      await _apiService.unbanServer(serverId);
      final index = _servers.indexWhere((s) => s.serverId == serverId);
      if (index != -1) {
        final old = _servers[index];
        _servers[index] = AdminServerSummary(
          serverId: old.serverId,
          name: old.name,
          description: old.description,
          iconUrl: old.iconUrl,
          ownerId: old.ownerId,
          ownerName: old.ownerName,
          memberCount: old.memberCount,
          channelCount: old.channelCount,
          createdAt: old.createdAt,
          isBanned: false,
        );
        notifyListeners();
      }
    } catch (e) {
      error = e.toString();
      notifyListeners();
    }
  }
}
