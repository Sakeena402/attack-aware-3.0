// lib/utils/constants.dart
import 'package:flutter/foundation.dart' show kReleaseMode;

class ApiConstants {
  /// Single source of truth for the backend base URL. The value MUST include
  /// the `/api` suffix, because request paths such as `/auth/login` are
  /// appended to it directly (see api_client.dart `_uri`).
  ///
  /// Dev on a physical phone over USB:
  ///   adb reverse tcp:5000 tcp:5000
  ///   flutter run --dart-define=API_BASE_URL=http://localhost:5000/api
  ///
  /// Release builds must always pass --dart-define=API_BASE_URL=https://...
  static const String _override = String.fromEnvironment('API_BASE_URL');
  static const String _devDefault = 'http://localhost:5000/api';

  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    if (kReleaseMode) {
      throw StateError(
        'API_BASE_URL is not set. Release builds require '
        '--dart-define=API_BASE_URL=https://<host>/api',
      );
    }
    return _devDefault;
  }
}

/// Builds a playable URL from a catalog file path. Every path segment is
/// URL-encoded, so spaces and brackets in file names work.
Uri buildVideoUri(String baseUrl, String filePath) {
  final base = Uri.parse(baseUrl);
  final segments = <String>[
    ...base.pathSegments.where((s) => s.isNotEmpty),
    ...filePath.split('/').where((s) => s.isNotEmpty),
  ];
  return base.replace(pathSegments: segments);
}

class VideoConstants {
  /// Where the website serves /videos/... from. The default is the deployed
  /// site, so no flag is needed. To use a local web dev server instead:
  ///   flutter run --dart-define=VIDEO_BASE_URL=http://localhost:3000
  static const String _override = String.fromEnvironment('VIDEO_BASE_URL');
  static const String _default = 'https://attack-aware-30.vercel.app';

  static String get baseUrl => _override.isNotEmpty ? _override : _default;

  static Uri urlFor(String filePath) => buildVideoUri(baseUrl, filePath);
}
