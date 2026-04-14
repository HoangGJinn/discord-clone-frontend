import 'package:flutter/foundation.dart';

class AppEnv {
  static const String _apiBaseUrlFromDefine = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static String get apiBaseUrl {
    if (_apiBaseUrlFromDefine.trim().isNotEmpty) {
      return _apiBaseUrlFromDefine.trim();
    }

    if (kIsWeb) {
      return 'http://localhost:8085/api';
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8085/api';
    }

    return 'http://localhost:8085/api';
  }

  const AppEnv._();
}
