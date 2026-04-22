import 'package:discord_clone_admin/core/network/api_client.dart';
import 'package:discord_clone_admin/features/effects/data/models/profile_effect_model.dart';
import 'package:shared_preferences/shared_preferences.dart';

class EffectsApiService {
  static const String _tokenKey = 'auth_token';
  final ApiClient _apiClient;

  EffectsApiService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<List<ProfileEffectModel>> getAllEffects() async {
    final token = await _getToken();
    final response = await _apiClient.get('/admin/effects', bearerToken: token);
    if (response is List) {
      return response
          .map<ProfileEffectModel>((e) => ProfileEffectModel.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    }
    return [];
  }

  Future<ProfileEffectModel> createEffect(ProfileEffectModel effect) async {
    final token = await _getToken();
    final response = await _apiClient.post('/admin/effects', effect.toJson(), bearerToken: token);
    return ProfileEffectModel.fromJson(response);
  }

  Future<ProfileEffectModel> updateEffect(int id, ProfileEffectModel effect) async {
    final token = await _getToken();
    final response = await _apiClient.put('/admin/effects/$id', effect.toJson(), bearerToken: token);
    return ProfileEffectModel.fromJson(response);
  }

  Future<void> deleteEffect(int id) async {
    final token = await _getToken();
    await _apiClient.delete('/admin/effects/$id', bearerToken: token);
  }

  Future<ProfileEffectModel> toggleEffectStatus(int id) async {
    final token = await _getToken();
    final response = await _apiClient.put('/admin/effects/$id/toggle', {}, bearerToken: token);
    return ProfileEffectModel.fromJson(response);
  }
}
