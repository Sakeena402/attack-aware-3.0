// lib/services/data_service.dart
import 'api_client.dart';

class DataService {
  final ApiClient api;
  DataService(this.api);

  // ── helpers ────────────────────────────────────────────────────────────────
  static num _num(dynamic v) => v is num ? v : (num.tryParse('$v') ?? 0);

  static String _date(dynamic v) {
    final s = v?.toString() ?? '';
    return s.length >= 10 ? s.substring(0, 10) : s;
  }

  // Backend: very_low|low|medium|high|critical  ->  UI: low|medium|high
  static String _risk(dynamic v) {
    switch (v?.toString()) {
      case 'medium':
        return 'medium';
      case 'high':
      case 'very_high':
      case 'critical':
        return 'high';
      default:
        return 'low';
    }
  }

  static List<Map<String, dynamic>> _list(dynamic v) => (v is List ? v : const [])
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();

  // ── GET /api/leaderboard ───────────────────────────────────────────────────
  Future<List<Map<String, dynamic>>> leaderboard() async {
    final res = await api.get('/leaderboard?limit=100');
    return _list(res['data']).map((e) {
      return {
        'id': (e['_id'] ?? e['userId']).toString(),
        'userId': (e['userId'] ?? '').toString(),
        'userName': (e['userName'] ?? 'Unknown').toString(),
        'department': (e['department'] ?? 'General').toString(),
        'score': _num(e['score']).toInt(),
        'badge': (e['badge'] ?? 'Rookie').toString(),
        'rank': _num(e['rank']).toInt(),
        'trend': (e['trend'] ?? 'stable').toString(),
      };
    }).toList();
  }

  // ── GET /api/employees  (admin) ────────────────────────────────────────────
  Future<List<Map<String, dynamic>>> employees() async {
    final res = await api.get('/employees?limit=100');
    final data = (res['data'] ?? {}) as Map<String, dynamic>;
    return _list(data['employees']).map((e) {
      return {
        'id': (e['id'] ?? e['_id']).toString(),
        'name': (e['name'] ?? '').toString(),
        'email': (e['email'] ?? '').toString(),
        'department': (e['department'] ?? 'General').toString(),
        'role': (e['role'] ?? 'employee').toString(),
        'riskLevel': _risk(e['riskLevel']),
        'points': _num(e['points']).toInt(),
        'badge': (e['badge'] ?? 'Rookie').toString(),
        'trainingProgress': _num(e['trainingProgress']).toInt(),
        'phoneNumber': (e['phoneNumber'] ?? '').toString(),
      };
    }).toList();
  }

  // ── POST /api/employees  (admin) ───────────────────────────────────────────
  // Same fields the website sends. companyId comes from the login token.
  Future<void> createEmployee(Map<String, dynamic> d) async {
    await api.post('/employees', {
      'name': (d['name'] ?? '').toString().trim(),
      'email': (d['email'] ?? '').toString().trim(),
      'password': (d['password'] ?? '').toString(),
      'department': (d['department'] ?? '').toString().trim(),
      'phoneNumber': (d['phoneNumber'] ?? '').toString().trim(),
      'role': 'employee',
    });
  }

  // ── PUT /api/employees/:id  (admin) ────────────────────────────────────────
  Future<void> updateEmployee(String id, Map<String, dynamic> d) async {
    final body = <String, dynamic>{
      'name': (d['name'] ?? '').toString().trim(),
      'email': (d['email'] ?? '').toString().trim(),
      'department': (d['department'] ?? '').toString().trim(),
      'phoneNumber': (d['phoneNumber'] ?? '').toString().trim(),
      'role': 'employee',
    };
    final pw = (d['password'] ?? '').toString();
    if (pw.isNotEmpty) body['password'] = pw;
    await api.put('/employees/$id', body);
  }

  // ── DELETE /api/employees/:id  (admin) ─────────────────────────────────────
  Future<void> deleteEmployee(String id) async {
    await api.delete('/employees/$id');
  }

  // ── GET /api/campaigns ─────────────────────────────────────────────────────
  Future<List<Map<String, dynamic>>> campaigns() async {
    final res = await api.get('/campaigns');
    return _list(res['data']).map((c) {
      return {
        'id': (c['_id'] ?? c['id']).toString(),
        'name': (c['campaignName'] ?? '').toString(),
        'type': (c['type'] ?? 'phishing').toString(),
        'status': (c['status'] ?? 'draft').toString(),
        'targets': (c['targetEmployees'] is List && (c['targetEmployees'] as List).isNotEmpty)
            ? (c['targetEmployees'] as List).length
            : _num(c['targetCount']).toInt(),
        'clickRate': _num(c['clickRate']),
        'reportRate': _num(c['reportRate']),
        'startDate': _date(c['startDate'] ?? c['createdAt']),
        'endDate': _date(c['endDate']),
        'description': (c['description'] ?? '').toString(),
        'emailTemplate': (c['emailTemplate'] ?? '').toString(),
        'smsTemplate': (c['smsTemplate'] ?? '').toString(),
        'voiceScript': (c['voiceScript'] ?? '').toString(),
        'aiGeneratedTemplateId': c['aiGeneratedTemplateId'] is Map
            ? (c['aiGeneratedTemplateId']['_id'])?.toString()
            : c['aiGeneratedTemplateId']?.toString(),
        'targetIds': (c['targetEmployees'] is List ? c['targetEmployees'] as List : const [])
            .whereType<Map>()
            .map((t) => (t['_id'] ?? '').toString())
            .toList(),
      };
    }).toList();
  }

  // ── POST /api/campaigns  and  PUT /api/campaigns/:id  (admin) ──────────────
  // Same fields the website sends. companyId / createdBy come from the token.
  // A new campaign is always a draft (nothing is sent until you launch it).
  Map<String, dynamic> _campaignBody(Map<String, dynamic> d) {
    final type = (d['type'] ?? 'phishing').toString();
    final body = <String, dynamic>{
      'campaignName': (d['name'] ?? '').toString().trim(),
      'type': type,
      'description': (d['description'] ?? '').toString().trim(),
      'targetEmployees': d['targetEmployees'] ?? const [],
    };
    final start = (d['startDate'] ?? '').toString();
    final end = (d['endDate'] ?? '').toString();
    if (start.isNotEmpty) body['startDate'] = start;
    if (end.isNotEmpty) body['endDate'] = end;
    final key = d['templateKey'];
    if (key != null) {
      body['emailTemplate'] = type == 'phishing' ? key : '';
      body['smsTemplate'] = type == 'smishing' ? key : '';
      body['voiceScript'] = type == 'vishing' ? key : '';
    }
    return body;
  }

  Future<void> createCampaign(Map<String, dynamic> d) async {
    await api.post('/campaigns', _campaignBody(d));
  }

  Future<void> updateCampaign(String id, Map<String, dynamic> d) async {
    await api.put('/campaigns/$id', _campaignBody(d));
  }

  // ── POST /api/campaigns/:id/launch  (admin) ────────────────────────────────
  // NOTE: this really sends the campaign's messages to its targets.
  Future<void> launchCampaign(String id) async {
    await api.post('/campaigns/$id/launch');
  }

  // ── POST /api/campaigns/:id/pause  (admin) ─────────────────────────────────
  Future<void> pauseCampaign(String id) async {
    await api.post('/campaigns/$id/pause');
  }

  // ── DELETE /api/campaigns/:id  (admin) ─────────────────────────────────────
  Future<void> deleteCampaign(String id) async {
    await api.delete('/campaigns/$id');
  }

  // ── GET /api/super-admin/companies  (super admin) ──────────────────────────
  Future<List<Map<String, dynamic>>> companies() async {
    final res = await api.get('/super-admin/companies');
    final data = (res['data'] ?? {}) as Map<String, dynamic>;
    return _list(data['companies']).map((c) {
      return {
        'id': (c['_id'] ?? c['id']).toString(),
        'companyName': (c['companyName'] ?? '').toString(),
        'industry': (c['industry'] ?? '').toString(),
        'createdAt': _date(c['createdAt']),
      };
    }).toList();
  }

  // ── GET /api/analytics/dashboard  (admin) ──────────────────────────────────
  // Keys: totalEmployees, totalCampaigns, activeCampaigns, avgClickRate,
  //       avgReportRate, trainingProgress, overallRiskScore, riskDistribution
  Future<Map<String, dynamic>> dashboardStats({String period = 'all'}) async {
    final res = await api.get('/analytics/dashboard?period=$period');
    return Map<String, dynamic>.from((res['data'] ?? {}) as Map);
  }

  // ── GET /api/analytics/simulations  (admin) ────────────────────────────────
  Future<Map<String, dynamic>> simulationAnalytics({String period = 'all'}) async {
    final res = await api.get('/analytics/simulations?period=$period');
    return Map<String, dynamic>.from((res['data'] ?? {}) as Map);
  }

  // ── GET /api/analytics/department-risk  (admin) ────────────────────────────
  Future<List<Map<String, dynamic>>> departmentRisk({String period = 'all'}) async {
    final res = await api.get('/analytics/department-risk?period=$period');
    return _list(res['data']);
  }

  // ── GET /api/analytics/me  (employee) ──────────────────────────────────────
  // Keys: user{points,badge,riskScore,riskLevel,...}, stats{...},
  //       ranking{rank,percentile}, history[]
  Future<Map<String, dynamic>> myAnalytics() async {
    final res = await api.get('/analytics/me');
    return Map<String, dynamic>.from((res['data'] ?? {}) as Map);
  }

  // ── Settings / account ─────────────────────────────────────────────────────
  // GET /api/settings  → {name,email,department,phoneNumber,...}
  Future<Map<String, dynamic>> settings() async {
    return Map<String, dynamic>.from(await api.get('/settings'));
  }

  // PUT /api/settings  (email is not sent; department only changes for admins)
  Future<void> updateSettings({required String name, required String phoneNumber, String? department}) async {
    final body = <String, dynamic>{'name': name.trim(), 'phoneNumber': phoneNumber.trim()};
    if (department != null && department.trim().isNotEmpty) body['department'] = department.trim();
    await api.put('/settings', body);
  }

  // PUT /api/users/change-password
  Future<void> changePassword(String current, String next) async {
    await api.put('/users/change-password', {'currentPassword': current, 'newPassword': next});
  }

  // PATCH /api/users/me/2fa  — step 1: emails a code
  Future<void> send2FACode() async {
    await api.patch('/users/me/2fa', {'enable': true});
  }

  // step 2: confirm the code
  Future<void> enable2FA(String code) async {
    await api.patch('/users/me/2fa', {'enable': true, 'code': code.trim()});
  }

  Future<void> disable2FA(String password) async {
    await api.patch('/users/me/2fa', {'enable': false, 'password': password});
  }

  // ── GET /api/super-admin/analytics/global  (super admin) ───────────────────
  // Keys: totalCompanies, totalEmployees, activeCampaigns, globalClickRate,
  //       platformGrowth[{month,companies,year}], industryData[{name,value}]
  Future<Map<String, dynamic>> globalAnalytics() async {
    final res = await api.get('/super-admin/analytics/global');
    return Map<String, dynamic>.from((res['data'] ?? {}) as Map);
  }

  // ── Companies (super admin) ────────────────────────────────────────────────
  Future<void> createCompany(String name, String industry) async {
    await api.post('/super-admin/companies', {'companyName': name.trim(), 'industry': industry.trim()});
  }

  Future<void> updateCompany(String id, String name, String industry) async {
    await api.put('/super-admin/companies/$id', {'companyName': name.trim(), 'industry': industry.trim()});
  }

  // Removes the company record only (same as the website).
  Future<void> deleteCompany(String id) async {
    await api.delete('/super-admin/companies/$id');
  }
}
