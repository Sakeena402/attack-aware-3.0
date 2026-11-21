// lib/screens/employee/employee_dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../data/video_catalog.dart';
import '../../models/leaderboard_entry.dart';
import '../../models/my_analytics.dart';
import '../../models/quiz_models.dart';
import '../../models/up_next.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../utils/load_state.dart';
import '../../widgets/async_body.dart';
import '../../widgets/common_widgets.dart';
import '../quizzes/quiz_session_screen.dart';
import '../videos/video_player_screen.dart';

// Same badge ladder as the website.
class _BadgeLevel {
  const _BadgeLevel(this.name, this.min, this.icon);
  final String name;
  final int min;
  final String icon;
}

const List<_BadgeLevel> _kBadges = [
  _BadgeLevel('Security Champion', 1000, '👑'),
  _BadgeLevel('Security Expert', 500, '🏆'),
  _BadgeLevel('Security Aware', 250, '🛡️'),
  _BadgeLevel('Security Learner', 100, '📚'),
  _BadgeLevel('Rookie', 0, '🎯'),
];

class _ActionStyle {
  const _ActionStyle(this.label, this.icon, this.color);
  final String label;
  final IconData icon;
  final Color color;
}

_ActionStyle _styleFor(SimulationAction action) {
  switch (action) {
    case SimulationAction.reported:
      return const _ActionStyle('Reported', Icons.check_circle_outline, Color(0xFF22C55E));
    case SimulationAction.compromised:
      return const _ActionStyle('Compromised', Icons.cancel_outlined, Color(0xFFEF4444));
    case SimulationAction.clicked:
      return const _ActionStyle('Clicked Link', Icons.warning_amber, Color(0xFFEAB308));
    case SimulationAction.engaged:
      return const _ActionStyle('Call Engaged', Icons.warning_amber, Color(0xFFF97316));
    case SimulationAction.ignored:
      return const _ActionStyle('No Action', Icons.remove_circle_outline, Color(0xFF94A3B8));
  }
}

/// Everything the dashboard needs in one load.
/// [leaders] is null for individual users (the backend has no leaderboard for
/// them) and when the leaderboard request failed ([leadersFailed] is true).
class _DashboardData {
  const _DashboardData({
    required this.me,
    this.leaders,
    this.leadersFailed = false,
    this.upNext = const [],
    this.upNextFailed = false,
  });
  final MyAnalytics me;
  final List<LeaderboardEntry>? leaders;
  final bool leadersFailed;

  /// What to do next; [upNextFailed] is true when part of that list could not be loaded.
  final List<UpNextItem> upNext;
  final bool upNextFailed;
}

/// Loads an optional part of the dashboard. A failure becomes null so one
/// broken request never hides the rest of the screen.
Future<T?> _tryLoad<T>(Future<T> future) async {
  try {
    return await future;
  } catch (_) {
    return null;
  }
}

class EmployeeDashboardScreen extends StatefulWidget {
  const EmployeeDashboardScreen({super.key, this.active = true});

  /// False while another tab is showing; turning true refreshes the data.
  final bool active;

  @override
  State<EmployeeDashboardScreen> createState() => _EmployeeDashboardScreenState();
}

class _EmployeeDashboardScreenState extends State<EmployeeDashboardScreen> {
  late final LoadController<_DashboardData> _controller;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _controller = LoadController<_DashboardData>(() => _fetch(auth))..load();
  }

  @override
  void didUpdateWidget(covariant EmployeeDashboardScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) _controller.refresh();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<_DashboardData> _fetch(AuthProvider auth) async {
    final data = auth.data;
    final isEmployee = auth.user?.isEmployee == true;

    // The optional parts start together; each can fail on its own.
    final leadersLoad = isEmployee ? _tryLoad(data.leaderboard()) : null;
    final assignedLoad = isEmployee ? _tryLoad(data.myAssignedQuizzes()) : null;
    final mineLoad = _tryLoad(data.myAdaptiveQuizzes());
    final completedLoad = _tryLoad(data.myCompletedVideos());

    final me = await data.myAnalytics();

    final leaders = await leadersLoad;
    final assigned = await assignedLoad;
    final mine = await mineLoad;
    final completed = await completedLoad;

    final completedIds = completed == null
        ? null
        : {
            for (final item in completed)
              if (item.videoId.isNotEmpty) item.videoId,
          };

    return _DashboardData(
      me: me,
      leaders: leaders,
      leadersFailed: isEmployee && leaders == null,
      upNext: buildUpNext(
        assigned: assigned ?? const <AssignedQuiz>[],
        mine: mine ?? const <QuizSummary>[],
        completedVideoIds: completedIds,
        catalog: kVideoCatalog,
      ),
      upNextFailed: mine == null || completed == null || (isEmployee && assigned == null),
    );
  }

  Future<void> _openUpNext(UpNextItem item) async {
    final video = item.video;
    final quizId = item.quizId;
    final Widget? page = video != null
        ? VideoPlayerScreen(video: video, alreadyCompleted: false)
        : (quizId != null ? QuizSessionScreen(quizId: quizId, title: item.title) : null);
    if (page == null) return;

    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
    if (mounted) await _controller.refresh();
  }

  Widget _buildUpNext(_DashboardData data) {
    return CyberCard(
      borderColor: AppColors.purple.withValues(alpha: 0.4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Up next', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          if (data.upNext.isEmpty)
            Text(
              data.upNextFailed
                  ? 'Your to-do list could not be loaded. Pull down to try again.'
                  : "You're all caught up. Open the Learn tab for more.",
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          for (final item in data.upNext)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _UpNextRow(item: item, onTap: () => _openUpNext(item)),
            ),
          if (data.upNext.isNotEmpty && data.upNextFailed)
            const Text(
              'Some items could not be loaded. Pull down to try again.',
              style: TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
        ],
      ),
    );
  }

  Color _riskColor(int risk) {
    if (risk >= 36) return AppColors.red;
    if (risk >= 16) return AppColors.yellow;
    return AppColors.green;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.user?.isLearner != true) {
      return const Center(child: Text('Access Denied', style: TextStyle(color: AppColors.red)));
    }

    return AsyncBody<_DashboardData>(
      controller: _controller,
      builder: (context, data) => _buildContent(data, auth.user?.id),
    );
  }

  Widget _buildContent(_DashboardData data, String? myId) {
    final user = data.me.user;
    final stats = data.me.stats;
    final ranking = data.me.ranking;
    final history = data.me.history;

    final pts = user.points;
    final riskScore = user.riskScore;
    final riskColor = _riskColor(riskScore);
    final earned = _kBadges.firstWhere((b) => pts >= b.min, orElse: () => _kBadges.last);
    final nexts = _kBadges.where((b) => b.min > pts).toList();
    final next = nexts.isEmpty ? null : nexts.last;
    final progress = next == null
        ? 1.0
        : ((pts - earned.min) / (next.min - earned.min)).clamp(0.0, 1.0).toDouble();
    final rank = ranking.rank;
    final percentile = ranking.percentile ?? 0;
    // Only employees have a company ranking (leaders is null for individuals).
    final showRanking = data.leaders != null || data.leadersFailed;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(title: 'Your Security Journey', subtitle: 'Track your security awareness progress'),
          const SizedBox(height: 16),
          _buildUpNext(data),
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
              if (showRanking)
                MetricCard(title: 'Company Rank', value: rank == null ? '—' : '#$rank', icon: Icons.emoji_events, color: AppColors.yellow),
              if (showRanking)
                MetricCard(title: 'Percentile', value: '$percentile%', icon: Icons.trending_up, color: AppColors.green),
              MetricCard(title: 'Badge Level', value: user.badge, icon: Icons.bolt, color: AppColors.blue),
            ],
          ),
          const SizedBox(height: 20),

          // Risk score
          CyberCard(
            borderColor: riskColor.withValues(alpha: 0.3),
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
                      child: Text('${user.riskLevel} risk'.toUpperCase(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: riskColor)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                AnimatedProgressBar(value: (riskScore / 100).clamp(0.0, 1.0).toDouble(), color: riskColor),
                const SizedBox(height: 16),
                InfoRow(label: 'Simulations received', value: '${stats.totalSimulations}'),
                const SizedBox(height: 6),
                InfoRow(label: 'Threats reported', value: '${stats.reports}', valueColor: AppColors.green),
                const SizedBox(height: 6),
                InfoRow(label: 'Links clicked', value: '${stats.clicks}', valueColor: AppColors.yellow),
                const SizedBox(height: 6),
                InfoRow(label: 'Compromised', value: '${stats.credentials}', valueColor: AppColors.red),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Badge progress
          CyberCard(
            borderColor: AppColors.purple.withValues(alpha: 0.3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Badge Progress', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 14),
                Row(children: [
                  Text(earned.icon, style: const TextStyle(fontSize: 34)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(earned.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                        Text(
                          next == null ? '$pts pts · Max level reached!' : '$pts pts · ${next.min - pts} pts to ${next.name}',
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
                    final got = pts >= b.min;
                    return Opacity(
                      opacity: got ? 1 : 0.4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: got ? AppColors.purple.withValues(alpha: 0.15) : AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: got ? AppColors.purple.withValues(alpha: 0.4) : AppColors.border),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Text(b.icon, style: const TextStyle(fontSize: 16)),
                          const SizedBox(width: 6),
                          Text(b.name, style: const TextStyle(fontSize: 11, color: AppColors.textPrimary)),
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
            borderColor: AppColors.blue.withValues(alpha: 0.3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Simulation History', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 12),
                if (history.isEmpty)
                  const Text('No simulations received yet — stay alert!', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                ...history.map((h) {
                  final cfg = _styleFor(h.action);
                  final date = h.date;
                  final dateText = date == null
                      ? ''
                      : '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(10)),
                      child: Row(children: [
                        Icon(cfg.icon, color: cfg.color, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(h.campaignName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                              Text('${h.type} · $dateText', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(cfg.label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: cfg.color)),
                            if (h.pointsEarned != 0)
                              Text('${h.pointsEarned > 0 ? '+' : ''}${h.pointsEarned} pts', style: TextStyle(fontSize: 11, color: h.pointsEarned > 0 ? AppColors.green : AppColors.red)),
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

          // Company rankings: employees only
          if (data.leaders != null || data.leadersFailed) ...[
            _buildRankings(data, myId),
            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }

  Widget _buildRankings(_DashboardData data, String? myId) {
    final leaders = data.leaders ?? const <LeaderboardEntry>[];
    return CyberCard(
      borderColor: AppColors.yellow.withValues(alpha: 0.3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Company Rankings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const Text('Compare with your peers', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(height: 12),
          if (data.leadersFailed)
            const Text('Rankings are unavailable right now. Pull down to try again.', style: TextStyle(fontSize: 12, color: AppColors.textMuted))
          else if (leaders.isEmpty)
            const Text('No leaderboard data yet.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ...leaders.take(10).map((e) {
            final isMe = myId != null && e.userId == myId;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isMe ? AppColors.purple.withValues(alpha: 0.15) : AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: isMe ? Border.all(color: AppColors.purple.withValues(alpha: 0.4)) : null,
                ),
                child: Row(children: [
                  RankBadge(rank: e.rank),
                  const SizedBox(width: 10),
                  UserAvatar(name: e.userName, radius: 16),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(isMe ? 'YOU' : e.userName, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isMe ? AppColors.purple : AppColors.textPrimary)),
                        Text(e.department, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                  Text('${e.score} pts', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: isMe ? AppColors.purple : AppColors.textSecondary)),
                ]),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _UpNextRow extends StatelessWidget {
  const _UpNextRow({required this.item, required this.onTap});

  final UpNextItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, Color color) = switch (item.kind) {
      UpNextKind.assignedQuiz => (
          item.isOverdue ? Icons.assignment_late_outlined : Icons.assignment_outlined,
          item.isOverdue ? AppColors.red : AppColors.yellow,
        ),
      UpNextKind.adaptiveQuiz => (Icons.auto_awesome_outlined, AppColors.purple),
      UpNextKind.video => (Icons.play_circle_outline, AppColors.green),
    };

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                  ),
                  Text(item.subtitle, style: TextStyle(fontSize: 11, color: item.isOverdue ? AppColors.red : AppColors.textMuted)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textMuted, size: 20),
          ],
        ),
      ),
    );
  }
}
