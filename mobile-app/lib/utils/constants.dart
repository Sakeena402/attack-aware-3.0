// lib/utils/constants.dart
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;

class ApiConstants {
  /// Run with a custom URL:
  /// flutter run --dart-define=API_BASE_URL=http://192.168.1.20:5000/api
  static const String _override = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    if (kIsWeb) return 'http://localhost:5000/api';
    // 10.0.2.2 = Android emulator's alias for your computer's localhost
    if (Platform.isAndroid) return 'http://10.0.2.2:5000/api';
    // iOS simulator reaches localhost directly
    return 'http://localhost:5000/api';
  }
}
