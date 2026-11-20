// lib/screens/videos/videos_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/video_catalog.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../utils/load_state.dart';
import '../../widgets/async_body.dart';
import '../../widgets/common_widgets.dart';
import 'video_player_screen.dart';

/// Training video library (employee and individual). The list comes from the
/// bundled catalog; which ones are done comes from GET /videos/me/completed.
class VideosScreen extends StatefulWidget {
  const VideosScreen({super.key});

  @override
  State<VideosScreen> createState() => _VideosScreenState();
}

class _VideosScreenState extends State<VideosScreen> {
  late final LoadController<Set<String>> _controller;
  String _language = 'all';

  @override
  void initState() {
    super.initState();
    final data = context.read<AuthProvider>().data;
    _controller = LoadController<Set<String>>(() async {
      final done = await data.myCompletedVideos();
      return {
        for (final item in done)
          if (item.videoId.isNotEmpty) item.videoId,
      };
    })
      ..load();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _open(CatalogVideo video, bool completed) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => VideoPlayerScreen(video: video, alreadyCompleted: completed),
      ),
    );
    if (mounted) await _controller.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return AsyncBody<Set<String>>(
      controller: _controller,
      isEmpty: (_) => kVideoCatalog.isEmpty,
      emptyTitle: 'No videos available',
      emptyIcon: Icons.video_library_outlined,
      builder: (context, completed) => _buildList(completed),
    );
  }

  Widget _buildList(Set<String> completed) {
    final languages = ['all', ...{...kVideoCatalog.map((v) => v.languageLabel)}];
    final language = languages.contains(_language) ? _language : 'all';
    final shown = language == 'all'
        ? kVideoCatalog
        : kVideoCatalog.where((v) => v.languageLabel == language).toList();
    final doneCount = kVideoCatalog.where((v) => completed.contains(v.id)).length;
    final total = kVideoCatalog.length;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        SectionHeader(title: 'Training Videos', subtitle: '$doneCount of $total completed'),
        const SizedBox(height: 12),
        AnimatedProgressBar(value: total == 0 ? 0 : doneCount / total, color: AppColors.green),
        const SizedBox(height: 16),
        FilterChipRow(options: languages, selected: language, onSelected: (v) => setState(() => _language = v)),
        const SizedBox(height: 16),
        for (final video in shown)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _VideoCard(
              video: video,
              completed: completed.contains(video.id),
              onTap: () => _open(video, completed.contains(video.id)),
            ),
          ),
      ],
    );
  }
}

class _VideoCard extends StatelessWidget {
  const _VideoCard({required this.video, required this.completed, required this.onTap});

  final CatalogVideo video;
  final bool completed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = completed ? AppColors.green : AppColors.purple;
    return CyberCard(
      onTap: onTap,
      borderColor: color.withValues(alpha: 0.3),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
            child: Icon(completed ? Icons.check_circle : Icons.play_circle_fill, color: color, size: 28),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  video.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    if (video.category.isNotEmpty) video.category,
                    video.languageLabel,
                    if (video.duration != null) video.duration!,
                  ].join(' · '),
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            completed ? 'Done' : 'Watch',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
          ),
        ],
      ),
    );
  }
}
