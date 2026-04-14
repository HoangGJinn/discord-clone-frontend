import 'dart:convert';

import 'package:discord_clone_admin/core/config/app_env.dart';
import 'package:discord_clone_admin/core/network/api_exception.dart';
import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({http.Client? httpClient}) : _httpClient = httpClient ?? http.Client();

  final http.Client _httpClient;

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    final response = await _httpClient
        .post(
          Uri.parse('${AppEnv.apiBaseUrl}$path'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 15));

    return _decodeAsMap(response);
  }

  Future<Map<String, dynamic>> get(
    String path, {
    String? bearerToken,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }

    final response = await _httpClient
        .get(
          Uri.parse('${AppEnv.apiBaseUrl}$path'),
          headers: headers,
        )
        .timeout(const Duration(seconds: 15));

    return _decodeAsMap(response);
  }

  Map<String, dynamic> _decodeAsMap(http.Response response) {
    final decodedBody = response.bodyBytes.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(utf8.decode(response.bodyBytes));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (decodedBody is Map<String, dynamic>) {
        return decodedBody;
      }
      throw ApiException('Dữ liệu trả về không hợp lệ', statusCode: response.statusCode);
    }

    final errorMessage = decodedBody is Map<String, dynamic>
        ? decodedBody['message']?.toString() ?? 'Lỗi kết nối backend'
        : 'Lỗi kết nối backend';

    throw ApiException(errorMessage, statusCode: response.statusCode);
  }
}
