// lib/services/auth_provider.dart
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user_model.dart';
import 'api_client.dart';
import 'auth_service.dart';
import 'data_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();
  late final AuthService _authService;
  late final DataService data; // used by screens to load real data
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const _kAccessToken = 'access_token';
  static const _kRefreshToken = 'refresh_token';

  UserModel? _user;
  bool _isLoading = false;
  bool _isAuthenticated = false;
  bool _isHydrated = false;
  String? _error;

  AuthProvider() {
    _authService = AuthService(_api);
    data = DataService(_api);
    _api.onUnauthorized = _attemptRefresh;
  }

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  bool get isHydrated => _isHydrated;
  String? get error => _error;

  Future<void> restoreSession() async {
    try {
      final accessToken = await _storage.read(key: _kAccessToken);
      final refreshToken = await _storage.read(key: _kRefreshToken);

      if (accessToken == null || refreshToken == null) {
        _isHydrated = true;
        notifyListeners();
        return;
      }

      _api.setTokens(accessToken: accessToken, refreshToken: refreshToken);

      try {
        _user = await _authService.getCurrentUser();
        _isAuthenticated = true;
      } catch (_) {
        final refreshed = await _attemptRefresh();
        if (!refreshed) await _clearSession();
      }
    } catch (_) {
      await _clearSession();
    } finally {
      _isHydrated = true;
      notifyListeners();
    }
  }

  Future<bool> _attemptRefresh() async {
    final refreshToken = await _storage.read(key: _kRefreshToken);
    if (refreshToken == null) return false;

    final result = await _authService.refreshAccessToken(refreshToken);
    if (result == null) {
      await _clearSession();
      return false;
    }

    await _persistSession(result);
    return true;
  }

  Future<void> _persistSession(AuthResult result) async {
    _user = result.user;
    _isAuthenticated = true;
    _api.setTokens(accessToken: result.accessToken, refreshToken: result.refreshToken);
    await _storage.write(key: _kAccessToken, value: result.accessToken);
    await _storage.write(key: _kRefreshToken, value: result.refreshToken);
    notifyListeners();
  }

  Future<void> _clearSession() async {
    _user = null;
    _isAuthenticated = false;
    _api.clearTokens();
    await _storage.delete(key: _kAccessToken);
    await _storage.delete(key: _kRefreshToken);
  }

  Future<T> _run<T>(Future<T> Function() action) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      return await action();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Returns the outcome. If outcome.requires2FA is true the caller must open
  /// the OTP screen; otherwise the session is already saved.
  Future<LoginOutcome> login(String email, String password) {
    return _run(() async {
      final outcome = await _authService.login(email.trim(), password);
      if (outcome.session != null) await _persistSession(outcome.session!);
      return outcome;
    });
  }

  Future<void> verifyLoginOtp(String tempToken, String code) {
    return _run(() async {
      final result = await _authService.verifyLoginOtp(tempToken, code);
      await _persistSession(result);
    });
  }

  Future<String> resendLoginOtp(String tempToken) {
    return _run(() => _authService.resendLoginOtp(tempToken));
  }

  /// Creates the account and emails the code. Does NOT log in.
  Future<void> register(String name, String email, String password) {
    return _run(() => _authService.register(
          name: name.trim(),
          email: email.trim(),
          password: password,
        ));
  }

  Future<void> verifySignupOtp(String email, String code) {
    return _run(() async {
      final result = await _authService.verifySignupOtp(email.trim(), code);
      await _persistSession(result);
    });
  }

  Future<void> resendSignupOtp(String email) {
    return _run(() => _authService.resendSignupOtp(email.trim()));
  }

  /// Re-reads the signed-in user from the backend (after a settings change).
  Future<void> refreshUser() async {
    try {
      _user = await _authService.getCurrentUser();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> logout() async {
    await _authService.logout();
    await _clearSession();
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
