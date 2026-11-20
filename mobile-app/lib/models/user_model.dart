// lib/models/user_model.dart

/// Roles the backend can put in the JWT / user payload (types/index.ts).
enum UserRole {
  superAdmin('super_admin'),
  admin('admin'),
  employee('employee'),
  individual('individual');

  const UserRole(this.wireName);
  final String wireName;

  /// Returns null for a missing or unknown value. Callers must treat null as
  /// an error state; it must never silently become `employee`.
  static UserRole? tryParse(String? value) {
    for (final role in UserRole.values) {
      if (role.wireName == value) return role;
    }
    return null;
  }
}

class UserModel {
  final String id;
  final String name;
  final String email;

  /// Role string exactly as the backend sent it (null if the field was absent).
  final String? rawRole;
  final String? companyId;
  final String? department;
  final String? phoneNumber;
  final int points;
  final String? badge;
  final List<String> badges;
  final int riskScore;
  final String riskLevel; // 'low' | 'medium' | 'high'
  final int trainingProgress;
  final String? lastLogin;
  final bool twoFactorEnabled;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.rawRole,
    this.companyId,
    this.department,
    this.phoneNumber,
    this.points = 0,
    this.badge,
    this.badges = const [],
    this.riskScore = 0,
    this.riskLevel = 'low',
    this.trainingProgress = 0,
    this.lastLogin,
    this.twoFactorEnabled = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      rawRole: json['role']?.toString(),
      companyId: json['companyId']?.toString(),
      department: json['department']?.toString(),
      phoneNumber: json['phoneNumber']?.toString(),
      points: json['points'] is int
          ? json['points']
          : int.tryParse('${json['points']}') ?? 0,
      badge: json['badge']?.toString(),
      badges: (json['badges'] is List)
          ? List<String>.from((json['badges'] as List).map((b) => b.toString()))
          : const [],
      riskScore: json['riskScore'] is int
          ? json['riskScore']
          : int.tryParse('${json['riskScore']}') ?? 0,
      riskLevel: json['riskLevel']?.toString() ?? 'low',
      trainingProgress: json['trainingProgress'] is int
          ? json['trainingProgress']
          : int.tryParse('${json['trainingProgress']}') ?? 0,
      lastLogin: json['lastLogin']?.toString(),
      twoFactorEnabled: json['twoFactorEnabled'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'role': rawRole,
    'companyId': companyId,
    'department': department,
    'phoneNumber': phoneNumber,
    'points': points,
    'badge': badge,
    'badges': badges,
    'riskScore': riskScore,
    'riskLevel': riskLevel,
    'trainingProgress': trainingProgress,
    'lastLogin': lastLogin,
    'twoFactorEnabled': twoFactorEnabled,
  };

  /// Parsed role, or null when the backend sent a missing/unknown role.
  UserRole? get role => UserRole.tryParse(rawRole);

  bool get isSuperAdmin => role == UserRole.superAdmin;
  bool get isAdmin => role == UserRole.admin;
  bool get isEmployee => role == UserRole.employee;
  bool get isIndividual => role == UserRole.individual;

  /// True only for the two roles the mobile app serves.
  bool get isLearner => isEmployee || isIndividual;
}
