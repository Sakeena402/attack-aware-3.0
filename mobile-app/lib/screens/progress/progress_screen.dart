// lib/screens/progress/progress_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/video_catalog.dart';
import '../../models/progress_models.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../utils/date_format.dart';
import '../../utils/load_state.dart';
import '../../widgets/async_body.dart';
import '../../widgets/common_widgets.dart';

/// What the learner has done so far: totals, achievements and recent activity.
/// Everything comes from GET /progress/me.
class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key, this.active = true});

  /// False while another tab is showing; turning true refreshes the data.
  final bool active;

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  late final LoadController<ProgressSummary> _controller;

  @override
  void initState() {
    super.initState();
    final data = context.read<AuthProvider>().data;
    _controller = LoadController<ProgressSummary>(data.myProgress)..load();
  }

  @override
  void didUpdateWidget(covariant ProgressScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) _controller.refresh();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  static String _videoTitle(String videoId) {
    for (final video in kVideoCatalog) {
      if (video.id == videoId) return video.title;
    }
    return videoId;
  }

  @override
  Widget build(BuildContext context) {
    return AsyncBody<ProgressSummary>(
      controller: _controller,
      builder: (context, progress) => _buildContent(progress),
    );
  }

  Widget _buildContent(ProgressSummary progress) {
    final feed = buildActivityFeed(progress, videoTitle: _videoTitle);

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(title: 'My Progress', subtitle: 'Everything you have learned so far'),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: [
            MetricCard(title: 'Points', value: '${progress.points}', icon: Icons.military_tech, color: AppColors.purple),
            MetricCard(title: 'Badge', value: progress.badge, icon: Icons.bolt, color: AppColors.blue),
            MetricCard(title: 'Videos completed', value: '${progress.videosCompleted}', icon: Icons.play_circle_outline, color: AppColors.green),
            MetricCard(title: 'Quiz attempts', value: '${progress.quizAttempts}', icon: Icons.quiz_outlined, color: AppColors.yellow),
            MetricCard(title: 'Games played', value: '${progress.gamesPlayed}', icon: Icons.sports_esports_outlined, color: AppColors.orange),
          ],
        ),
        const SizedBox(height: 16),
        CyberCard(
          borderColor: AppColors.purple.withValues(alpha: 0.3),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Achievements', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              SizedBox(height: 8),
              Text(
                'Achievements are not available yet. Keep earning points to level up your badge.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        CyberCard(
          borderColor: AppColors.blue.withValues(alpha: 0.3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Recent activity', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 12),
              if (feed.isEmpty)
                const Text(
                  'No activity yet. Watch a video or take a quiz to get started.',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              for (final item in feed)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _ActivityRow(item: item),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.item});

  final ActivityItem item;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, Color color) = switch (item.kind) {
      ActivityKind.video => (Icons.play_circle_outline, AppColors.green),
      ActivityKind.quiz => (Icons.quiz_outlined, AppColors.yellow),
      ActivityKind.game => (Icons.sports_esports_outlined, AppColors.orange),
    };
    final when = item.when;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(10)),
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
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                ),
                Text(
                  when == null ? item.detail : '${item.detail} · ${formatDate(when)}',
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
