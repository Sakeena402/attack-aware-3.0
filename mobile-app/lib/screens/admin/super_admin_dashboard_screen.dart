// lib/screens/admin/super_admin_dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';

num _n(dynamic v) => v is num ? v : (num.tryParse('$v') ?? 0);

class SuperAdminDashboardScreen extends StatefulWidget {
  const SuperAdminDashboardScreen({super.key});

  @override
  State<SuperAdminDashboardScreen> createState() => _SuperAdminDashboardScreenState();
}

class _SuperAdminDashboardScreenState extends State<SuperAdminDashboardScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic> _g = {};
  List<Map<String, dynamic>> _companies = [];

  static const _pieColors = [AppColors.purple, AppColors.cyan, AppColors.yellow, AppColors.red, AppColors.green, AppColors.blue, AppColors.orange];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = context.read<AuthProvider>().data;
      final r = await Future.wait([data.globalAnalytics(), data.companies()]);
      if (!mounted) return;
      setState(() {
        _g = r[0] as Map<String, dynamic>;
        _companies = r[1] as List<Map<String, dynamic>>;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  List<Map<String, dynamic>> _list(dynamic v) =>
      (v is List ? v : const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.user?.role != 'super_admin') {
      return const Center(child: Text('Access Denied: Super Admin role required', style: TextStyle(color: AppColors.red)));
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

    final growth = _list(_g['platformGrowth']);
    final industry = _list(_g['industryData']);
    final clickRate = _n(_g['globalClickRate']).toDouble();

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: 'Platform Administration', subtitle: 'Global platform overview and management'),
            const SizedBox(height: 20),

            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: [
                MetricCard(title: 'Total Companies', value: '${_g['totalCompanies'] ?? 0}', icon: Icons.business, color: AppColors.purple),
                MetricCard(title: 'Total Employees', value: '${_g['totalEmployees'] ?? 0}', icon: Icons.people, color: AppColors.blue),
                MetricCard(title: 'Active Campaigns', value: '${_g['activeCampaigns'] ?? 0}', icon: Icons.bolt, color: AppColors.green),
                MetricCard(title: 'Global Click Rate', value: '${clickRate.toStringAsFixed(1)}%', icon: Icons.trending_up, color: AppColors.orange),
              ],
            ),
            const SizedBox(height: 20),

            CyberCard(
              borderColor: AppColors.purple.withOpacity(0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Platform Growth', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      Icon(Icons.show_chart, color: AppColors.cyan, size: 22),
                    ],
                  ),
                  const Text('New companies per month', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  const SizedBox(height: 16),
                  SizedBox(height: 180, child: _GrowthChart(data: growth)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            CyberCard(
              borderColor: AppColors.yellow.withOpacity(0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Companies by Industry', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      Icon(Icons.public, color: AppColors.yellow, size: 22),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(height: 180, child: _IndustryPie(data: industry, colors: _pieColors)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            CyberCard(
              borderColor: AppColors.purple.withOpacity(0.3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('All Companies', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      Icon(Icons.business, color: AppColors.purple, size: 22),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_companies.isEmpty)
                    const Text('No companies yet.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ..._companies.map((c) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                          child: Row(
                            children: [
                              Container(
                                width: 42, height: 42,
                                decoration: BoxDecoration(color: AppColors.purple.withOpacity(0.2), borderRadius: BorderRadius.circular(10)),
                                child: const Icon(Icons.business, color: AppColors.purple, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${c['companyName']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                                    Text('${c['industry']}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                  ],
                                ),
                              ),
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
}

class _GrowthChart extends StatelessWidget {
  final List<Map<String, dynamic>> data;
  const _GrowthChart({required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const Center(child: Text('No registration data yet.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)));
    }
    return BarChart(BarChartData(
      alignment: BarChartAlignment.spaceAround,
      minY: 0,
      gridData: FlGridData(show: true, getDrawingHorizontalLine: (_) => const FlLine(color: AppColors.border, strokeWidth: 0.5), drawVerticalLine: false),
      titlesData: FlTitlesData(
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 28, interval: 1, getTitlesWidget: (v, _) => v == v.roundToDouble() ? Text('${v.toInt()}', style: const TextStyle(color: AppColors.textMuted, fontSize: 9)) : const SizedBox.shrink())),
        bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 22, getTitlesWidget: (v, _) {
          final i = v.toInt();
          if (i < 0 || i >= data.length) return const SizedBox.shrink();
          return Text('${data[i]['month']}', style: const TextStyle(color: AppColors.textMuted, fontSize: 10));
        })),
      ),
      borderData: FlBorderData(show: false),
      barGroups: data.asMap().entries.map((e) => BarChartGroupData(
            x: e.key,
            barRods: [BarChartRodData(toY: _n(e.value['companies']).toDouble(), color: AppColors.purple, width: 20, borderRadius: const BorderRadius.vertical(top: Radius.circular(6)))],
          )).toList(),
    ));
  }
}

class _IndustryPie extends StatelessWidget {
  final List<Map<String, dynamic>> data;
  final List<Color> colors;
  const _IndustryPie({required this.data, required this.colors});

  @override
  Widget build(BuildContext context) {
    final total = data.fold<double>(0, (s, d) => s + _n(d['value']).toDouble());
    if (data.isEmpty || total <= 0) {
      return const Center(child: Text('No companies yet.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)));
    }
    return Row(
      children: [
        Expanded(
          child: PieChart(PieChartData(
            sections: data.asMap().entries.map((e) {
              final v = _n(e.value['value']).toDouble();
              return PieChartSectionData(
                value: v,
                color: colors[e.key % colors.length],
                title: '${(v / total * 100).round()}%',
                titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                radius: 60,
              );
            }).toList(),
            sectionsSpace: 2,
            centerSpaceRadius: 30,
          )),
        ),
        const SizedBox(width: 16),
        Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: data.asMap().entries.map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(children: [
                  Container(width: 10, height: 10, decoration: BoxDecoration(color: colors[e.key % colors.length], borderRadius: BorderRadius.circular(2))),
                  const SizedBox(width: 6),
                  Text('${e.value['name']}', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                ]),
              )).toList(),
        ),
      ],
    );
  }
}
