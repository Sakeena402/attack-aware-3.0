// lib/screens/admin/admin_dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';

num _n(dynamic v) => v is num ? v : (num.tryParse('$v') ?? 0);

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic> _stats = {};
  List<Map<String, dynamic>> _dept = [];
  List<Map<String, dynamic>> _campaigns = [];
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
      final r = await Future.wait([
        data.dashboardStats(),
        data.departmentRisk(),
        data.campaigns(),
        data.leaderboard(),
      ]);
      if (!mounted) return;
      setState(() {
        _stats = r[0] as Map<String, dynamic>;
        _dept = r[1] as List<Map<String, dynamic>>;
        _campaigns = r[2] as List<Map<String, dynamic>>;
        _leaders = r[3] as List<Map<String, dynamic>>;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  String _pct(dynamic v) => '${_n(v).toDouble().toStringAsFixed(1)}%';

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.user?.role != 'admin') {
      return const Center(child: Text('Access Denied: Admin role required', style: TextStyle(color: AppColors.red)));
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

    final recent = _campaigns.take(4).toList();
    final top = _leaders.take(5).toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(title: 'Company Dashboard', subtitle: "Manage your company's security awareness"),
            const SizedBox(height: 20),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.4,
              children: [
                MetricCard(title: 'Total Employees', value: '${_stats['totalEmployees'] ?? 0}', icon: Icons.people, color: AppColors.purple),
                MetricCard(title: 'Active Campaigns', value: '${_stats['activeCampaigns'] ?? 0}', icon: Icons.bolt, color: AppColors.blue),
                MetricCard(title: 'Click Rate', value: _pct(_stats['avgClickRate']), icon: Icons.gps_fixed, color: AppColors.orange),
                MetricCard(title: 'Report Rate', value: _pct(_stats['avgReportRate']), icon: Icons.warning_amber, color: AppColors.green),
              ],
            ),
            const SizedBox(height: 20),

            // Overall rates (the website has no month-by-month trend data)
            CyberCard(
              borderColor: AppColors.purple.withValues(alpha: 0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Click vs Report vs Compromise', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      Icon(Icons.trending_up, color: AppColors.purple, size: 22),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 200,
                    child: _RatesChart(
                      click: _n(_stats['avgClickRate']).toDouble(),
                      report: _n(_stats['avgReportRate']).toDouble(),
                      compromise: _n(_stats['avgCompromiseRate']).toDouble(),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            CyberCard(
              borderColor: AppColors.cyan.withValues(alpha: 0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Department Vulnerability', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      Icon(Icons.bar_chart, color: AppColors.cyan, size: 22),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(height: 200, child: _DeptBarChart(depts: _dept)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Recent Campaigns
            CyberCard(
              borderColor: AppColors.purple.withValues(alpha: 0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Recent Campaigns', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      Icon(Icons.bolt, color: AppColors.purple, size: 22),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (recent.isEmpty)
                    const Text('No campaigns yet.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ...recent.map((c) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(10)),
                          child: Row(
                            children: [
                              Icon(_campaignIcon('${c['type']}'), color: _campaignColor('${c['type']}'), size: 18),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${c['name']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                                    Text('${c['type']}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                  ],
                                ),
                              ),
                              StatusBadge(status: '${c['status']}'),
                            ],
                          ),
                        ),
                      )),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Top Performers
            CyberCard(
              borderColor: AppColors.yellow.withValues(alpha: 0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Top Performers', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      Icon(Icons.emoji_events, color: AppColors.yellow, size: 22),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (top.isEmpty)
                    const Text('No leaderboard data yet.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ...top.map((e) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(10)),
                          child: Row(
                            children: [
                              RankBadge(rank: _n(e['rank']).toInt()),
                              const SizedBox(width: 10),
                              UserAvatar(name: '${e['userName']}', radius: 16),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${e['userName']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                                    Text('${e['department']}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                  ],
                                ),
                              ),
                              Text('${e['score']} pts', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.purple)),
                            ],
                          ),
                        ),
                      )),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  IconData _campaignIcon(String type) {
    switch (type) {
      case 'smishing': return Icons.sms_outlined;
      case 'vishing': return Icons.phone_outlined;
      default: return Icons.email_outlined;
    }
  }

  Color _campaignColor(String type) {
    switch (type) {
      case 'smishing': return AppColors.yellow;
      case 'vishing': return AppColors.blue;
      default: return AppColors.red;
    }
  }
}

class _RatesChart extends StatelessWidget {
  final double click;
  final double report;
  final double compromise;
  const _RatesChart({required this.click, required this.report, required this.compromise});

  @override
  Widget build(BuildContext context) {
    final labels = ['Click', 'Report', 'Compromise'];
    final values = [click, report, compromise];
    final colors = [AppColors.orange, AppColors.green, AppColors.red];
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: 100,
        minY: 0,
        gridData: FlGridData(show: true, getDrawingHorizontalLine: (_) => const FlLine(color: AppColors.border, strokeWidth: 0.5), drawVerticalLine: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 34, interval: 25, getTitlesWidget: (v, _) => Text('${v.toInt()}%', style: const TextStyle(color: AppColors.textMuted, fontSize: 10)))),
          bottomTitles: AxisTitles(sideTitles: SideTitles(
            showTitles: true, reservedSize: 22,
            getTitlesWidget: (v, _) => Text(labels[v.toInt() % labels.length], style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
          )),
        ),
        borderData: FlBorderData(show: false),
        barGroups: List.generate(3, (i) => BarChartGroupData(
          x: i,
          barRods: [BarChartRodData(toY: values[i].clamp(0.0, 100.0).toDouble(), color: colors[i], width: 28, borderRadius: const BorderRadius.vertical(top: Radius.circular(6)))],
        )),
      ),
    );
  }
}

class _DeptBarChart extends StatelessWidget {
  final List<Map<String, dynamic>> depts;
  const _DeptBarChart({required this.depts});

  static const colors = [AppColors.purple, AppColors.cyan, AppColors.yellow, AppColors.green];

  @override
  Widget build(BuildContext context) {
    if (depts.isEmpty) {
      return const Center(child: Text('No department data yet.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)));
    }
    final shown = depts.take(6).toList();
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: 100,
        minY: 0,
        gridData: FlGridData(show: true, getDrawingHorizontalLine: (_) => const FlLine(color: AppColors.border, strokeWidth: 0.5), drawVerticalLine: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 32, interval: 25, getTitlesWidget: (v, _) => Text('${v.toInt()}', style: const TextStyle(color: AppColors.textMuted, fontSize: 10)))),
          bottomTitles: AxisTitles(sideTitles: SideTitles(
            showTitles: true, reservedSize: 22,
            getTitlesWidget: (v, _) {
              final i = v.toInt();
              if (i < 0 || i >= shown.length) return const SizedBox.shrink();
              var name = '${shown[i]['department']}';
              if (name.length > 7) name = '${name.substring(0, 6)}…';
              return Text(name, style: const TextStyle(color: AppColors.textMuted, fontSize: 10));
            },
          )),
        ),
        borderData: FlBorderData(show: false),
        barGroups: shown.asMap().entries.map((e) => BarChartGroupData(
          x: e.key,
          barRods: [BarChartRodData(toY: _n(e.value['avgRiskScore']).toDouble().clamp(0.0, 100.0).toDouble(), color: colors[e.key % colors.length], width: 24, borderRadius: const BorderRadius.vertical(top: Radius.circular(6)))],
        )).toList(),
      ),
    );
  }
}
