// lib/services/auth_service.dart
import 'api_client.dart';
import '../models/user_model.dart';

class AuthResult {
  final UserModel user;
  final String accessToken;
  final String refreshToken;
  AuthResult({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });
}

/// Result of step 1 of login: either a full session, or "2FA code needed".
class LoginOutcome {
  final AuthResult? session;
  final String? tempToken;
  final String? email;
  const LoginOutcome({this.session, this.tempToken, this.email});
  bool get requires2FA => tempToken != null;
}

class AuthService {
  final ApiClient api;
  AuthService(this.api);

  AuthResult _parseSession(Map<String, dynamic> res) {
    final data = res['data'] as Map<String, dynamic>;
    final access = data['accessToken'];
    final refresh = data['refreshToken'];
    if (access == null || refresh == null) {
      throw ApiException(
        'Server did not return tokens. Make sure the backend has the X-Client: mobile change.',
      );
    }
    return AuthResult(
      user: UserModel.fromJson(data['user'] as Map<String, dynamic>),
      accessToken: access.toString(),
      refreshToken: refresh.toString(),
    );
  }

  Future<LoginOutcome> login(String email, String password) async {
    final res = await api.post('/auth/login', {
      'email': email,
      'password': password,
    });
    final data = (res['data'] ?? {}) as Map<String, dynamic>;
    if (data['requires2FA'] == true) {
      return LoginOutcome(
        tempToken: data['tempToken']?.toString(),
        email: data['email']?.toString() ?? email,
      );
    }
    return LoginOutcome(session: _parseSession(res));
  }

  /// Step 2 of 2FA login.
  Future<AuthResult> verifyLoginOtp(String tempToken, String code) async {
    final res = await api.post('/auth/verify-otp', {
      'tempToken': tempToken,
      'code': code,
    });
    return _parseSession(res);
  }

  /// Returns a fresh tempToken.
  Future<String> resendLoginOtp(String tempToken) async {
    final res = await api.post('/auth/resend-otp', {'tempToken': tempToken});
    final data = (res['data'] ?? {}) as Map<String, dynamic>;
    return (data['tempToken'] ?? tempToken).toString();
  }

  /// Creates the account. Backend emails a 6-digit code; NO session yet.
  /// (Backend creates every self-registered user with role "individual";
  /// companyName / industry are not part of the register API.)
  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    await api.post('/auth/register', {
      'name': name,
      'email': email,
      'password': password,
    });
  }

  Future<AuthResult> verifySignupOtp(String email, String code) async {
    final res = await api.post('/auth/verify-signup-otp', {
      'email': email,
      'code': code,
    });
    return _parseSession(res);
  }

  Future<void> resendSignupOtp(String email) async {
    await api.post('/auth/resend-signup-otp', {'email': email});
  }

  Future<UserModel> getCurrentUser() async {
    final res = await api.get('/auth/me');
    return UserModel.fromJson(res['data'] as Map<String, dynamic>);
  }

  Future<AuthResult?> refreshAccessToken(String refreshToken) async {
    try {
      final res = await api.post('/auth/refresh', {'refreshToken': refreshToken});
      return _parseSession(res);
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
  }
}
