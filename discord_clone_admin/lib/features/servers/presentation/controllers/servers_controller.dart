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

  Future<void> loadServers({String? search}) async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      final response = await _apiService.getAllServers(search: search);
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
}
