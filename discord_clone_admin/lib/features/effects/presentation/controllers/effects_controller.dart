import 'package:discord_clone_admin/features/effects/data/models/profile_effect_model.dart';
import 'package:discord_clone_admin/features/effects/data/services/effects_api_service.dart';
import 'package:flutter/foundation.dart';

class EffectsController extends ChangeNotifier {
  final EffectsApiService _apiService;

  List<ProfileEffectModel> _effects = [];
  bool isLoading = false;
  String? error;

  EffectsController({EffectsApiService? apiService})
      : _apiService = apiService ?? EffectsApiService();

  List<ProfileEffectModel> get effects => _effects;

  Future<void> loadEffects() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      _effects = await _apiService.getAllEffects();
    } catch (e) {
      error = e.toString();
      _effects = [];
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createEffect(ProfileEffectModel effect) async {
    try {
      await _apiService.createEffect(effect);
      await loadEffects();
    } catch (e) {
      error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> updateEffect(int id, ProfileEffectModel effect) async {
    try {
      await _apiService.updateEffect(id, effect);
      await loadEffects();
    } catch (e) {
      error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> deleteEffect(int id) async {
    try {
      await _apiService.deleteEffect(id);
      await loadEffects();
    } catch (e) {
      error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> toggleEffectStatus(int id) async {
    try {
      await _apiService.toggleEffectStatus(id);
      await loadEffects();
    } catch (e) {
      error = e.toString();
      notifyListeners();
      rethrow;
    }
  }
}
