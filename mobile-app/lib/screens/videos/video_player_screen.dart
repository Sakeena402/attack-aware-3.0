// lib/screens/videos/video_player_screen.dart
import 'dart:async' show unawaited;
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';

import '../../data/video_catalog.dart';
import '../../services/api_client.dart';
import '../../services/auth_provider.dart';
import '../../services/data_service.dart';
import '../../services/video_progress_store.dart';
import '../../utils/app_theme.dart';
import '../../utils/constants.dart';
import '../../utils/video_rules.dart';
import '../../widgets/common_widgets.dart';

enum _Phase { checking, blocked, loading, ready, failed }

/// Plays one training video and reports completion the same way the website
/// does: GET /videos/:id/access when it opens, POST /videos/:id/watch only
/// when the video reaches its end. Where the user stopped is kept on this
/// device (VideoProgressStore) and never sent to the backend.
class VideoPlayerScreen extends StatefulWidget {
  const VideoPlayerScreen({super.key, required this.video, required this.alreadyCompleted});

  final CatalogVideo video;
  final bool alreadyCompleted;

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> with WidgetsBindingObserver {
  final VideoProgressStore _store = const VideoProgressStore();
  late final DataService _data;
  late final String? _userId;

  VideoPlayerController? _controller;
  _Phase _phase = _Phase.checking;
  String _message = '';

  bool _completed = false;
  bool _finishedHandled = false;
  bool _marking = false;
  String? _saveError;

  bool _wasPlaying = false;
  double? _dragMs;
  Duration? _resumedAt;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _data = auth.data;
    _userId = auth.user?.id;
    _completed = widget.alreadyCompleted;
    WidgetsBinding.instance.addObserver(this);
    _start();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final controller = _controller;
    final userId = _userId;
    if (controller != null && userId != null && !_finishedHandled && controller.value.isInitialized) {
      // Remember where the user stopped (fire and forget).
      unawaited(_store.write(userId, widget.video.id, controller.value.position));
    }
    _controller = null;
    controller?.removeListener(_onTick);
    controller?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      _controller?.pause();
      _savePosition();
    }
  }

  // ── loading ────────────────────────────────────────────────────────────────

  Future<void> _start() async {
    final old = _controller;
    _controller = null;
    if (old != null) {
      old.removeListener(_onTick);
      await old.dispose();
    }
    if (!mounted) return;
    setState(() {
      _phase = _Phase.checking;
      _message = '';
    });

    // Only plan errors block the page. A network problem lets the video play,
    // exactly like the website.
    try {
      await _data.checkVideoAccess(widget.video.id);
    } on ApiException catch (e) {
      if (isPlanBlock(e)) {
        if (!mounted) return;
        setState(() {
          _phase = _Phase.blocked;
          _message = e.message;
        });
        return;
      }
    }
    if (!mounted) return;
    await _initPlayer();
  }

  Future<void> _initPlayer() async {
    setState(() => _phase = _Phase.loading);
    final controller = VideoPlayerController.networkUrl(VideoConstants.urlFor(widget.video.filePath));
    _controller = controller;
    try {
      await controller.initialize();
      final userId = _userId;
      final saved = userId == null ? null : await _store.read(userId, widget.video.id);
      final resumeAt = resumePointFor(saved, controller.value.duration);
      if (resumeAt != null) await controller.seekTo(resumeAt);
      if (!mounted || _controller != controller) return;
      controller.addListener(_onTick);
      setState(() {
        _phase = _Phase.ready;
        _resumedAt = resumeAt;
      });
    } catch (_) {
      if (!mounted || _controller != controller) return;
      setState(() {
        _phase = _Phase.failed;
        _message = "This video couldn't be loaded. Check your connection and try again.";
      });
    }
  }

  // ── playback events ────────────────────────────────────────────────────────

  void _onTick() {
    final controller = _controller;
    if (controller == null || !mounted || _phase != _Phase.ready) return;
    final value = controller.value;

    if (value.hasError) {
      setState(() {
        _phase = _Phase.failed;
        _message = 'Playback stopped because of an error. Check your connection and try again.';
      });
      return;
    }

    final finished = !_finishedHandled && isPlaybackFinished(value.position, value.duration);
    if (finished) {
      _finishedHandled = true;
      _onFinished();
    } else if (_wasPlaying && !value.isPlaying && !_finishedHandled) {
      _savePosition(); // paused: remember the spot
    }
    _wasPlaying = value.isPlaying;
    setState(() {});
  }

  Future<void> _savePosition() async {
    final controller = _controller;
    final userId = _userId;
    if (controller == null || userId == null || _finishedHandled || !controller.value.isInitialized) return;
    await _store.write(userId, widget.video.id, controller.value.position);
  }

  Future<void> _onFinished() async {
    final userId = _userId;
    if (userId != null) await _store.clear(userId, widget.video.id);
    if (_completed || _marking) return;
    await _markWatched();
  }

  Future<void> _markWatched() async {
    if (!mounted) return;
    setState(() {
      _marking = true;
      _saveError = null;
    });
    try {
      await _data.markVideoWatched(widget.video.id);
      if (mounted) setState(() => _completed = true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _saveError = e.message);
    } catch (_) {
      if (mounted) setState(() => _saveError = "Couldn't save your progress. Please try again.");
    } finally {
      if (mounted) setState(() => _marking = false);
    }
  }

  void _togglePlay() {
    final controller = _controller;
    if (controller == null) return;
    controller.value.isPlaying ? controller.pause() : controller.play();
  }

  Future<void> _skip(int seconds) async {
    final controller = _controller;
    if (controller == null) return;
    final duration = controller.value.duration;
    var target = controller.value.position + Duration(seconds: seconds);
    if (target < Duration.zero) target = Duration.zero;
    if (target > duration) target = duration;
    await controller.seekTo(target);
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  static String _fmt(Duration d) {
    final total = d.inSeconds;
    final h = total ~/ 3600;
    final m = (total % 3600) ~/ 60;
    final s = total % 60;
    final ss = s.toString().padLeft(2, '0');
    return h > 0 ? '$h:${m.toString().padLeft(2, '0')}:$ss' : '$m:$ss';
  }

  @override
  Widget build(BuildContext context) {
    final video = widget.video;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: Text(video.title, maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildPlayerArea(),
          const SizedBox(height: 16),
          if (_phase == _Phase.ready) _buildStatus(),
          if (_phase == _Phase.ready) const SizedBox(height: 16),
          Text(video.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              if (video.category.isNotEmpty) _chip(video.category),
              _chip(video.languageLabel),
              if (video.duration != null) _chip(video.duration!),
            ],
          ),
          if (video.description.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(video.description, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
          ],
        ],
      ),
    );
  }

  Widget _chip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.purple.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.purple.withValues(alpha: 0.3)),
      ),
      child: Text(text, style: const TextStyle(fontSize: 11, color: AppColors.textPrimary)),
    );
  }

  Widget _frame(Widget child) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: AspectRatio(aspectRatio: 16 / 9, child: ColoredBox(color: Colors.black, child: child)),
    );
  }

  Widget _buildPlayerArea() {
    switch (_phase) {
      case _Phase.checking:
      case _Phase.loading:
        return _frame(const Center(child: CircularProgressIndicator()));
      case _Phase.blocked:
        return _messageCard(
          icon: Icons.lock_outline,
          color: AppColors.yellow,
          title: 'Not available right now',
          message: _message,
        );
      case _Phase.failed:
        return _messageCard(
          icon: Icons.error_outline,
          color: AppColors.red,
          title: "Couldn't play this video",
          message: _message,
          actionLabel: 'Try again',
          onAction: _start,
        );
      case _Phase.ready:
        final controller = _controller;
        if (controller == null) return _frame(const Center(child: CircularProgressIndicator()));
        return _buildPlayer(controller);
    }
  }

  Widget _messageCard({
    required IconData icon,
    required Color color,
    required String title,
    required String message,
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    return CyberCard(
      borderColor: color.withValues(alpha: 0.4),
      child: Column(
        children: [
          Icon(icon, size: 40, color: color),
          const SizedBox(height: 12),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 14),
            OutlinedButton(onPressed: onAction, child: Text(actionLabel)),
          ],
        ],
      ),
    );
  }

  Widget _buildPlayer(VideoPlayerController controller) {
    final value = controller.value;
    final duration = value.duration;
    final maxMs = math.max(duration.inMilliseconds.toDouble(), 1.0);
    final positionMs = math.min(value.position.inMilliseconds.toDouble(), maxMs);
    final shownMs = _dragMs ?? positionMs;

    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: AspectRatio(
            aspectRatio: value.aspectRatio > 0 ? value.aspectRatio : 16 / 9,
            child: GestureDetector(
              onTap: _togglePlay,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  VideoPlayer(controller),
                  if (!value.isPlaying)
                    const ColoredBox(
                      color: Colors.black38,
                      child: Center(child: Icon(Icons.play_arrow, size: 64, color: Colors.white)),
                    ),
                ],
              ),
            ),
          ),
        ),
        Slider(
          value: shownMs,
          max: maxMs,
          onChanged: duration.inMilliseconds > 0 ? (v) => setState(() => _dragMs = v) : null,
          onChangeEnd: (v) async {
            await controller.seekTo(Duration(milliseconds: v.round()));
            if (mounted) setState(() => _dragMs = null);
          },
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(_fmt(Duration(milliseconds: shownMs.round())), style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              Text(_fmt(duration), style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(onPressed: () => _skip(-10), icon: const Icon(Icons.replay_10), color: AppColors.textPrimary, iconSize: 32),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _togglePlay,
              icon: Icon(value.isPlaying ? Icons.pause_circle_filled : Icons.play_circle_fill),
              color: AppColors.purple,
              iconSize: 56,
            ),
            const SizedBox(width: 8),
            IconButton(onPressed: () => _skip(10), icon: const Icon(Icons.forward_10), color: AppColors.textPrimary, iconSize: 32),
          ],
        ),
        if (_resumedAt != null)
          Text('Resumed from ${_fmt(_resumedAt!)}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
      ],
    );
  }

  Widget _buildStatus() {
    if (_marking) {
      return _banner(Icons.sync, AppColors.blue, 'Saving your progress...');
    }
    final error = _saveError;
    if (error != null) {
      return _banner(Icons.error_outline, AppColors.red, error, actionLabel: 'Try again', onAction: _markWatched);
    }
    if (_completed) {
      return _banner(Icons.check_circle_outline, AppColors.green, 'Completed. This video is marked as watched.');
    }
    return _banner(Icons.info_outline, AppColors.textMuted, 'Watch to the end and this video is marked as completed.');
  }

  Widget _banner(IconData icon, Color color, String text, {String? actionLabel, VoidCallback? onAction}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: AppColors.textPrimary))),
          if (actionLabel != null && onAction != null)
            TextButton(onPressed: onAction, child: Text(actionLabel)),
        ],
      ),
    );
  }
}
