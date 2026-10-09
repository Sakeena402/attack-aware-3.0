// lib/screens/employee/employee_dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';

num _n(dynamic v) => v is num ? v : (num.tryParse('$v') ?? 0);

// Same badge ladder as the website.
const List<Map<String, dynamic>> _kBadges = [
  {'name': 'Security Champion', 'min': 1000, 'icon': '👑'},
  {'name': 'Security Expert', 'min': 500, 'icon': '🏆'},
  {'name': 'Security Aware', 'min': 250, 'icon': '🛡️'},
  {'name': 'Security Learner', 'min': 100, 'icon': '📚'},
  {'name': 'Rookie', 'min': 0, 'icon': '🎯'},
];

const Map<String, List<dynamic>> _kActions = {
  'reported': ['Reported', Icons.check_circle_outline, Color(0xFF22C55E)],
  'compromised': ['Compromised', Icons.cancel_outlined, Color(0xFFEF4444)],
  'clicked': ['Clicked Link', Icons.warning_amber, Color(0xFFEAB308)],
  'engaged': ['Call Engaged', Icons.warning_amber, Color(0xFFF97316)],
  'ignored': ['No Action', Icons.remove_circle_outline, Color(0xFF94A3B8)],
};

class EmployeeDashboardScreen extends StatefulWidget {
  const EmployeeDashboardScreen({super.key});

  @override
  State<EmployeeDashboardScreen> createState() => _EmployeeDashboardScreenState();
}

class _EmployeeDashboardScreenState extends State<EmployeeDashboardScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic> _me = {};
  List<Map<String, dynamic>> _leaders = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = context.read<AuthProvider>().data;
      final me = await data.myAnalytics();
      List<Map<String, dynamic>> leaders = [];
      try {
        leaders = await data.leaderboard();
      } catch (_) {
        // The leaderboard is optional; the rest of the page still works.
      }
      if (!mounted) return;
      setState(() {
        _me = me;
        _leaders = leaders;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Color _riskColor(int risk) {
    if (risk >= 36) return AppColors.red;
    if (risk >= 16) return AppColors.yellow;
    return AppColors.green;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.user?.role != 'employee' && auth.user?.role != 'individual') {
      return const Center(child: Text('Access Denied', style: TextStyle(color: AppColors.red)));
    }
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.red)),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: _load, child: const Text('Retry')),
          ]),
        ),
      );
    }

    final user = Map<String, dynamic>.from((_me['user'] ?? {}) as Map);
    final stats = Map<String, dynamic>.from((_me['stats'] ?? {}) as Map);
    final ranking = Map<String, dynamic>.from((_me['ranking'] ?? {}) as Map);
    final history = (_me['history'] is List ? _me['history'] as List : const []).whereType<Map>().toList();

    final pts = _n(user['points']).toInt();
    final riskScore = _n(user['riskScore']).toInt();
    final riskColor = _riskColor(riskScore);
    final earned = _kBadges.firstWhere((b) => pts >= (b['min'] as int), orElse: () => _kBadges.last);
    final nexts = _kBadges.where((b) => (b['min'] as int) > pts).toList();
    final next = nexts.isEmpty ? null : nexts.last;
    final progress = next == null
        ? 1.0
        : ((pts - (earned['min'] as int)) / ((next['min'] as int) - (earned['min'] as int))).clamp(0.0, 1.0).toDouble();
    final rank = ranking['rank'];
    final percentile = _n(ranking['percentile']).toInt();
    final myId = auth.user?.id;

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: 'Your Security Journey', subtitle: 'Track your security awareness progress'),
            const SizedBox(height: 20),

            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: [
                MetricCard(title: 'Your Points', value: '$pts', icon: Icons.military_tech, color: AppColors.purple),
                MetricCard(title: 'Company Rank', value: rank == null ? '—' : '#$rank', icon: Icons.emoji_events, color: AppColors.yellow),
                MetricCard(title: 'Percentile', value: '$percentile%', icon: Icons.trending_up, color: AppColors.green),
                MetricCard(title: 'Badge Level', value: '${user['badge'] ?? 'Rookie'}', icon: Icons.bolt, color: AppColors.blue),
              ],
            ),
            const SizedBox(height: 20),

            // Risk score
            CyberCard(
              borderColor: riskColor.withOpacity(0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Your Risk Score', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('$riskScore', style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: riskColor)),
                      const SizedBox(width: 10),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text('${user['riskLevel'] ?? 'low'} risk'.toUpperCase(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: riskColor)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  AnimatedProgressBar(value: (riskScore / 100).clamp(0.0, 1.0).toDouble(), color: riskColor),
                  const SizedBox(height: 16),
                  InfoRow(label: 'Simulations received', value: '${stats['totalSimulations'] ?? 0}'),
                  const SizedBox(height: 6),
                  InfoRow(label: 'Threats reported', value: '${stats['reports'] ?? 0}', valueColor: AppColors.green),
                  const SizedBox(height: 6),
                  InfoRow(label: 'Links clicked', value: '${stats['clicks'] ?? 0}', valueColor: AppColors.yellow),
                  const SizedBox(height: 6),
                  InfoRow(label: 'Compromised', value: '${stats['credentials'] ?? 0}', valueColor: AppColors.red),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Badge progress
            CyberCard(
              borderColor: AppColors.purple.withOpacity(0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Badge Progress', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  const SizedBox(height: 14),
                  Row(children: [
                    Text('${earned['icon']}', style: const TextStyle(fontSize: 34)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${earned['name']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                          Text(
                            next == null ? '$pts pts · Max level reached!' : '$pts pts · ${(next['min'] as int) - pts} pts to ${next['name']}',
                            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ]),
                  if (next != null) ...[
                    const SizedBox(height: 12),
                    AnimatedProgressBar(value: progress, color: AppColors.purple),
                  ],
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _kBadges.reversed.map((b) {
                      final got = pts >= (b['min'] as int);
                      return Opacity(
                        opacity: got ? 1 : 0.4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: got ? AppColors.purple.withOpacity(0.15) : AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: got ? AppColors.purple.withOpacity(0.4) : AppColors.border),
                          ),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Text('${b['icon']}', style: const TextStyle(fontSize: 16)),
                            const SizedBox(width: 6),
                            Text('${b['name']}', style: const TextStyle(fontSize: 11, color: AppColors.textPrimary)),
                          ]),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Simulation history
            CyberCard(
              borderColor: AppColors.blue.withOpacity(0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Simulation History', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  const SizedBox(height: 12),
                  if (history.isEmpty)
                    const Text('No simulations received yet — stay alert!', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ...history.map((h) {
                    final cfg = _kActions['${h['action']}'] ?? _kActions['ignored']!;
                    final color = cfg[2] as Color;
                    final pointsEarned = _n(h['pointsEarned']).toInt();
                    final date = DateTime.tryParse('${h['date']}');
                    final dateText = date == null ? '' : '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(10)),
                        child: Row(children: [
                          Icon(cfg[1] as IconData, color: color, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${h['campaignName']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                                Text('${h['type']} · $dateText', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(cfg[0] as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
                              if (pointsEarned != 0)
                                Text('${pointsEarned > 0 ? '+' : ''}$pointsEarned pts', style: TextStyle(fontSize: 11, color: pointsEarned > 0 ? AppColors.green : AppColors.red)),
                            ],
                          ),
                        ]),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Leaderboard
            CyberCard(
              borderColor: AppColors.yellow.withOpacity(0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Company Rankings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  const Text('Compare with your peers', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  const SizedBox(height: 12),
                  if (_leaders.isEmpty)
                    const Text('No leaderboard data yet.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ..._leaders.take(10).map((e) {
                    final isMe = myId != null && '${e['userId']}' == myId;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isMe ? AppColors.purple.withOpacity(0.15) : AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: isMe ? Border.all(color: AppColors.purple.withOpacity(0.4)) : null,
                        ),
                        child: Row(children: [
                          RankBadge(rank: _n(e['rank']).toInt()),
                          const SizedBox(width: 10),
                          UserAvatar(name: '${e['userName']}', radius: 16),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(isMe ? 'YOU' : '${e['userName']}', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isMe ? AppColors.purple : AppColors.textPrimary)),
                                Text('${e['department']}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                              ],
                            ),
                          ),
                          Text('${e['score']} pts', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: isMe ? AppColors.purple : AppColors.textSecondary)),
                        ]),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
