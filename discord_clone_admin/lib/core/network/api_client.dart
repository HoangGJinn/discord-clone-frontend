import 'dart:convert';

import 'package:discord_clone_admin/core/config/app_env.dart';
import 'package:discord_clone_admin/core/network/api_exception.dart';
import 'package:http/http.dart' as http;

class ApiClient {
  final http.Client _httpClient;

  ApiClient({http.Client? httpClient}) : _httpClient = httpClient ?? http.Client();

  static String get baseUrl => AppEnv.apiBaseUrl;

  Future<dynamic> post(
    String path,
    Map<String, dynamic> body, {
    String? bearerToken,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }

    final response = await _httpClient
        .post(
          Uri.parse('${AppEnv.apiBaseUrl}$path'),
          headers: headers,
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 15));

    return _decode(response);
  }

  Future<dynamic> get(
    String path, {
    String? bearerToken,
    Map<String, String>? queryParameters,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }

    Uri uri = Uri.parse('${AppEnv.apiBaseUrl}$path');
    if (queryParameters != null && queryParameters.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParameters);
    }

    final response = await _httpClient
        .get(uri, headers: headers)
        .timeout(const Duration(seconds: 15));

    return _decode(response);
  }

  Future<dynamic> put(
    String path,
    Map<String, dynamic> body, {
    String? bearerToken,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }

    final response = await _httpClient
        .put(
          Uri.parse('${AppEnv.apiBaseUrl}$path'),
          headers: headers,
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 15));

    return _decode(response);
  }

  Future<void> delete(
    String path, {
    String? bearerToken,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }

    final response = await _httpClient
        .delete(
          Uri.parse('${AppEnv.apiBaseUrl}$path'),
          headers: headers,
        )
        .timeout(const Duration(seconds: 15));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException('Delete failed', statusCode: response.statusCode);
    }
  }

  dynamic _decode(http.Response response) {
    if (response.bodyBytes.isEmpty) return <String, dynamic>{};
    
    final decodedBody = jsonDecode(utf8.decode(response.bodyBytes));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decodedBody;
    }

    final errorMessage = decodedBody is Map<String, dynamic>
        ? decodedBody['message']?.toString() ?? 'Lỗi kết nối backend'
        : 'Lỗi kết nối backend';

    throw ApiException(errorMessage, statusCode: response.statusCode);
  }
}
