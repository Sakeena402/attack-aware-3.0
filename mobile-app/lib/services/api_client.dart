// lib/services/api_client.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});
  @override
  String toString() => message;
}

typedef TokenRefreshCallback = Future<bool> Function();

class ApiClient {
  String? _accessToken;
  String? _refreshToken;

  TokenRefreshCallback? onUnauthorized;

  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;

  void setTokens({String? accessToken, String? refreshToken}) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  void clearTokens() {
    _accessToken = null;
    _refreshToken = null;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        // Tells the backend to also return tokens in the JSON body
        'X-Client': 'mobile',
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
      };

  Uri _uri(String path) => Uri.parse('${ApiConstants.baseUrl}$path');

  Future<Map<String, dynamic>> get(String path) => _send('GET', path);
  Future<Map<String, dynamic>> post(String path, [Map<String, dynamic>? body]) =>
      _send('POST', path, body);
  Future<Map<String, dynamic>> put(String path, [Map<String, dynamic>? body]) =>
      _send('PUT', path, body);
  Future<Map<String, dynamic>> patch(String path, [Map<String, dynamic>? body]) =>
      _send('PATCH', path, body);
  Future<Map<String, dynamic>> delete(String path) => _send('DELETE', path);

  Future<http.Response> _dispatch(String method, Uri uri, String? body) {
    switch (method) {
      case 'GET':
        return http.get(uri, headers: _headers);
      case 'POST':
        return http.post(uri, headers: _headers, body: body);
      case 'PUT':
        return http.put(uri, headers: _headers, body: body);
      case 'PATCH':
        return http.patch(uri, headers: _headers, body: body);
      case 'DELETE':
        return http.delete(uri, headers: _headers);
      default:
        throw ApiException('Unsupported HTTP method: $method');
    }
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String path, [
    Map<String, dynamic>? body,
    bool isRetry = false,
  ]) async {
    final uri = _uri(path);
    final encodedBody = body != null ? jsonEncode(body) : null;
    http.Response response;

    try {
      response = await _dispatch(method, uri, encodedBody)
          .timeout(const Duration(seconds: 20));
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException(
        'Could not reach the server. Check your connection and that the backend is running.',
      );
    }

    // Auth endpoints (login, verify-otp, refresh...) must never trigger a refresh loop
    final isAuthEndpoint = path.startsWith('/auth/');
    if (response.statusCode == 401 &&
        !isRetry &&
        !isAuthEndpoint &&
        onUnauthorized != null) {
      final refreshed = await onUnauthorized!();
      if (refreshed) {
        return _send(method, path, body, true);
      }
    }

    Map<String, dynamic> decoded = {};
    if (response.body.isNotEmpty) {
      try {
        final parsed = jsonDecode(response.body);
        if (parsed is Map<String, dynamic>) decoded = parsed;
      } catch (_) {}
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    final errorMessage = (decoded['error'] ?? decoded['message'])?.toString() ??
        'Request failed (status ${response.statusCode})';
    throw ApiException(errorMessage, statusCode: response.statusCode);
  }
}
