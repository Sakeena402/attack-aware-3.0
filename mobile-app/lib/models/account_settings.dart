// lib/models/account_settings.dart
import '../utils/json_helpers.dart';

/// GET /api/settings. Fields the backend leaves out stay null so the screen
/// can keep what it already knows from the sign-in response.
class AccountSettings {
  const AccountSettings({this.name, this.email, this.department, this.phoneNumber});

  final String? name;
  final String? email;
  final String? department;
  final String? phoneNumber;

  factory AccountSettings.fromJson(JsonMap json) => AccountSettings(
        name: asStringOrNull(json['name']),
        email: asStringOrNull(json['email']),
        department: asStringOrNull(json['department']),
        phoneNumber: asStringOrNull(json['phoneNumber']),
      );
}
