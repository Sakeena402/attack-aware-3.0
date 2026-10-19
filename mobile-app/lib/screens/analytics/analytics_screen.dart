// lib/screens/analytics/analytics_screen.dart
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  String _period = 'all';
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _sim;
  List<Map<String, dynamic>> _dept = [];
  Map<String, dynamic> _dash = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = context.read<AuthProvider>().data;
      final results = await Future.wait([
        data.simulationAnalytics(period: _period),
        data.departmentRisk(period: _period),
        data.dashboardStats(period: _period),
      ]);
      if (!mounted) return;
      setState(() {
        _sim = results[0] as Map<String, dynamic>;
        _dept = results[1] as List<Map<String, dynamic>>;
        _dash = results[2] as Map<String, dynamic>;
        _loading = false;
      });
    } catch (err) {
      if (mounted) setState(() { _error = err.toString(); _loading = false; });
    }
  }

  num _n(dynamic v) => v is num ? v : (num.tryParse('$v') ?? 0);
  String _p(dynamic v) {
    final x = _n(v).toDouble();
    return '${x == x.roundToDouble() ? x.toInt() : x.toStringAsFixed(1)}%';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _sim == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null && _sim == null) {
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
    final sim = _sim ?? const <String, dynamic>{};
    final summary = Map<String, dynamic>.from((sim['summary'] ?? {}) as Map);
    final phishing = Map<String, dynamic>.from((sim['phishing'] ?? {}) as Map);
    final smishing = Map<String, dynamic>.from((sim['smishing'] ?? {}) as Map);
    final vishing = Map<String, dynamic>.from((sim['vishing'] ?? {}) as Map);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: 'Analytics & Reports', subtitle: 'Comprehensive security awareness metrics'),
          const SizedBox(height: 16),

          // Period filter
          FilterChipRow(
            options: const ['all', 'week', 'month', 'quarter', 'year'],
            selected: _period,
            onSelected: (v) {
              if (v == _period) return;
              setState(() => _period = v);
              _load();
            },
          ),
          if (_loading) const Padding(padding: EdgeInsets.only(top: 8), child: LinearProgressIndicator()),
          const SizedBox(height: 20),

          // Overview stats
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.7,
            children: [
              MetricCard(title: 'Total Simulations', value: '${summary['totalSimulations'] ?? 0}', icon: Icons.bolt, color: AppColors.purple),
              MetricCard(title: 'Overall Risk Score', value: '${summary['overallRiskScore'] ?? 0}%', icon: Icons.warning_amber, color: AppColors.red),
              MetricCard(title: 'Threats Reported', value: '${summary['totalReported'] ?? 0}', icon: Icons.shield, color: AppColors.green),
              MetricCard(title: 'Compromised', value: '${summary['totalCompromised'] ?? 0}', icon: Icons.dangerous_outlined, color: AppColors.orange),
            ],
          ),
          const SizedBox(height: 20),

          // Simulation type cards
          CyberCard(borderColor: AppColors.red.withOpacity(0.3), child: _SimCard(icon: Icons.email_outlined, iconColor: AppColors.red, title: 'Email Phishing', items: [
            {'label': 'Total Simulations', 'value': '${phishing['total'] ?? 0}', 'color': null},
            {'label': 'Click Rate', 'value': _p(phishing['clickRate']), 'color': AppColors.red},
            {'label': 'Compromise Rate', 'value': _p(phishing['compromiseRate']), 'color': AppColors.orange},
            {'label': 'Report Rate', 'value': _p(phishing['reportRate']), 'color': AppColors.green},
          ])),
          const SizedBox(height: 12),
          CyberCard(borderColor: AppColors.yellow.withOpacity(0.3), child: _SimCard(icon: Icons.sms_outlined, iconColor: AppColors.yellow, title: 'SMS Smishing', items: [
            {'label': 'Messages Sent', 'value': '${smishing['sent'] ?? 0}', 'color': null},
            {'label': 'Delivery Rate', 'value': _p(smishing['deliveryRate']), 'color': AppColors.blue},
            {'label': 'Click Rate', 'value': _p(smishing['clickRate']), 'color': AppColors.yellow},
            {'label': 'Compromise Rate', 'value': _p(smishing['compromiseRate']), 'color': AppColors.red},
            {'label': 'Report Rate', 'value': _p(smishing['reportRate']), 'color': AppColors.green},
          ])),
          const SizedBox(height: 12),
          CyberCard(borderColor: AppColors.blue.withOpacity(0.3), child: _SimCard(icon: Icons.phone_outlined, iconColor: AppColors.blue, title: 'Voice Vishing', items: [
            {'label': 'Calls Initiated', 'value': '${vishing['initiated'] ?? 0}', 'color': null},
            {'label': 'Answer Rate', 'value': _p(vishing['answerRate']), 'color': AppColors.blue},
            {'label': 'Engagement Rate', 'value': _p(vishing['engagementRate']), 'color': AppColors.yellow},
            {'label': 'Report Rate', 'value': _p(vishing['reportRate']), 'color': AppColors.green},
          ])),
          const SizedBox(height: 20),

          // Bar chart comparison
          CyberCard(
            borderColor: AppColors.purple.withOpacity(0.3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(children: [
                  Icon(Icons.bar_chart, color: AppColors.purple, size: 20),
                  SizedBox(width: 8),
                  Text('Simulation Type Comparison', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                ]),
                const SizedBox(height: 16),
                SizedBox(height: 200, child: _ComparisonBarChart(data: [
                  {'label': 'Phishing', 'total': _n(phishing['total']), 'clicked': _n(phishing['clicked']), 'reported': _n(phishing['reported'])},
                  {'label': 'Smishing', 'total': _n(smishing['sent']), 'clicked': _n(smishing['clicked']), 'reported': _n(smishing['reported'])},
                  {'label': 'Vishing', 'total': _n(vishing['initiated']), 'clicked': _n(vishing['engaged']), 'reported': _n(vishing['reported'])},
                ])),
                const SizedBox(height: 8),
                Wrap(spacing: 12, children: const [
                  _LegendItem(color: AppColors.purple, label: 'Total'),
                  _LegendItem(color: AppColors.yellow, label: 'Clicked'),
                  _LegendItem(color: AppColors.green, label: 'Reported'),
                ]),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Pie chart
          CyberCard(
            borderColor: AppColors.purple.withOpacity(0.3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(children: [
                  Icon(Icons.pie_chart_outline, color: AppColors.purple, size: 20),
                  SizedBox(width: 8),
                  Text('Overall Response Distribution', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                ]),
                const SizedBox(height: 16),
                SizedBox(height: 180, child: _ResponsePieChart(summary: summary)),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Department Risk
          CyberCard(
            borderColor: AppColors.orange.withOpacity(0.3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(children: [
                  Icon(Icons.warning_amber, color: AppColors.orange, size: 20),
                  SizedBox(width: 8),
                  Text('Department Risk Analysis', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                ]),
                const SizedBox(height: 16),
                if (_dept.isEmpty) const Text('No department data for this period.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                ..._dept.map((d) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(children: [
                            Container(width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: _riskColor(_n(d['avgRiskScore']).toInt()))),
                            const SizedBox(width: 8),
                            Text('${d['department']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                            const SizedBox(width: 6),
                            Text('(${d['employees']} emp)', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                          ]),
                          Text('${d['avgRiskScore']}%', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: _riskColor(_n(d['avgRiskScore']).toInt()))),
                        ],
                      ),
                      const SizedBox(height: 6),
                      AnimatedProgressBar(value: (_n(d['avgRiskScore']).toDouble() / 100).clamp(0.0, 1.0), color: _riskColor(_n(d['avgRiskScore']).toInt())),
                    ],
                  ),
                )),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // KPI Summary
          CyberCard(
            borderColor: AppColors.purple.withOpacity(0.3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Key Performance Indicators', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 16),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.8,
                  children: [
                    _KpiCard(value: _p(_dash['avgClickRate']), label: 'Phish-Prone Rate', subLabel: 'Lower is better', subColor: AppColors.green, subIcon: Icons.trending_down),
                    _KpiCard(value: _p(_dash['avgReportRate']), label: 'Avg Report Rate', subLabel: 'Higher is better', subColor: AppColors.green, subIcon: Icons.trending_up),
                    _KpiCard(value: '${_dash['activeCampaigns'] ?? 0}', label: 'Active Campaigns', subLabel: ''),
                    _KpiCard(value: _p(_dash['trainingProgress']), label: 'Training Progress', subLabel: ''),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Color _riskColor(int risk) {
    if (risk >= 36) return AppColors.red;
    if (risk >= 16) return AppColors.yellow;
    return AppColors.green;
  }
}

class _SimCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final List<Map<String, dynamic>> items;

  const _SimCard({required this.icon, required this.iconColor, required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: iconColor.withOpacity(0.15), borderRadius: BorderRadius.circular(8)), child: Icon(icon, color: iconColor, size: 18)),
          const SizedBox(width: 10),
          Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        ]),
        const SizedBox(height: 12),
        ...items.map((item) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: InfoRow(label: item['label'] as String, value: item['value'] as String, valueColor: item['color'] as Color?),
        )),
      ],
    );
  }
}

class _ComparisonBarChart extends StatelessWidget {
  final List<Map<String, dynamic>> data;
  const _ComparisonBarChart({required this.data});

  @override
  Widget build(BuildContext context) {
    return BarChart(BarChartData(
      alignment: BarChartAlignment.spaceAround,
      gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (_) => const FlLine(color: AppColors.border, strokeWidth: 0.5)),
      titlesData: FlTitlesData(
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 30, getTitlesWidget: (v, _) => Text('${v.toInt()}', style: const TextStyle(color: AppColors.textMuted, fontSize: 9)))),
        bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 24, getTitlesWidget: (v, _) => Text(data[v.toInt()]['label'] as String, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)))),
      ),
      borderData: FlBorderData(show: false),
      barGroups: data.asMap().entries.map((e) => BarChartGroupData(
        x: e.key,
        barsSpace: 4,
        barRods: [
          BarChartRodData(toY: (e.value['total'] as num).toDouble(), color: AppColors.purple, width: 12, borderRadius: const BorderRadius.vertical(top: Radius.circular(4))),
          BarChartRodData(toY: (e.value['clicked'] as num).toDouble(), color: AppColors.yellow, width: 12, borderRadius: const BorderRadius.vertical(top: Radius.circular(4))),
          BarChartRodData(toY: (e.value['reported'] as num).toDouble(), color: AppColors.green, width: 12, borderRadius: const BorderRadius.vertical(top: Radius.circular(4))),
        ],
      )).toList(),
    ));
  }
}

class _ResponsePieChart extends StatelessWidget {
  final Map<String, dynamic> summary;
  const _ResponsePieChart({required this.summary});

  @override
  Widget build(BuildContext context) {
    num n(dynamic v) => v is num ? v : (num.tryParse('$v') ?? 0);
    final total = n(summary['totalSimulations']).toDouble();
    if (total <= 0) {
      return const Center(child: Text('No simulation data for this period.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)));
    }
    final compromised = n(summary['totalCompromised']).toDouble();
    final reported = n(summary['totalReported']).toDouble();
    final safe = (total - compromised - reported).clamp(0.0, total).toDouble();

    return Row(
      children: [
        Expanded(
          child: PieChart(PieChartData(
            sections: [
              PieChartSectionData(value: safe, color: AppColors.green, title: 'Safe\n${(safe / total * 100).toStringAsFixed(0)}%', titleStyle: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold), radius: 65),
              PieChartSectionData(value: compromised, color: AppColors.red, title: 'Comp.\n${(compromised / total * 100).toStringAsFixed(0)}%', titleStyle: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold), radius: 65),
              PieChartSectionData(value: reported, color: AppColors.purple, title: 'Rep.\n${(reported / total * 100).toStringAsFixed(0)}%', titleStyle: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold), radius: 65),
            ],
            sectionsSpace: 2,
            centerSpaceRadius: 25,
          )),
        ),
        const SizedBox(width: 16),
        Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _LegendItem(color: AppColors.green,  label: 'Safe (${safe.toInt()})'),
            const SizedBox(height: 8),
            _LegendItem(color: AppColors.red,    label: 'Compromised (${compromised.toInt()})'),
            const SizedBox(height: 8),
            _LegendItem(color: AppColors.purple, label: 'Reported (${reported.toInt()})'),
          ],
        ),
      ],
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String value;
  final String label;
  final String subLabel;
  final Color? subColor;
  final IconData? subIcon;

  const _KpiCard({required this.value, required this.label, required this.subLabel, this.subColor, this.subIcon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12)),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted), textAlign: TextAlign.center),
          if (subLabel.isNotEmpty) ...[
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (subIcon != null) Icon(subIcon, size: 12, color: subColor ?? AppColors.green),
                const SizedBox(width: 2),
                Text(subLabel, style: TextStyle(fontSize: 10, color: subColor ?? AppColors.green)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}