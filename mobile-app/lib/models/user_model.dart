// lib/models/user_model.dart

class UserModel {
  final String id;
  final String name;
  final String email;
  final String role; // 'super_admin' | 'admin' | 'employee' | 'individual'
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
    required this.role,
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
      role: json['role']?.toString() ?? 'employee',
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
    'role': role,
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

  bool get isSuperAdmin => role == 'super_admin';
  bool get isAdmin => role == 'admin';
  bool get isEmployee => role == 'employee';
  bool get isIndividual => role == 'individual';
}
