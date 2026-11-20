// lib/screens/quizzes/quizzes_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/quiz_models.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../utils/load_state.dart';
import '../../widgets/async_body.dart';
import '../../widgets/common_widgets.dart';
import 'quiz_session_screen.dart';

/// Everything the Quizzes tab shows. Only [library] is required; the other two
/// are extras, so a failure there must not hide the library.
class _QuizzesData {
  const _QuizzesData({
    required this.library,
    required this.mine,
    required this.assigned,
    required this.extrasFailed,
  });

  final List<QuizSummary> library;
  final List<QuizSummary> mine;
  final List<AssignedQuiz> assigned;
  final bool extrasFailed;
}

class QuizzesScreen extends StatefulWidget {
  const QuizzesScreen({super.key});

  @override
  State<QuizzesScreen> createState() => _QuizzesScreenState();
}

class _QuizzesScreenState extends State<QuizzesScreen> {
  late final LoadController<_QuizzesData> _controller;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _controller = LoadController<_QuizzesData>(() => _fetch(auth))..load();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<_QuizzesData> _fetch(AuthProvider auth) async {
    final data = auth.data;
    final library = await data.quizLibrary();

    var extrasFailed = false;

    var mine = const <QuizSummary>[];
    try {
      mine = await data.myAdaptiveQuizzes();
    } catch (_) {
      extrasFailed = true;
    }

    // Assigned quizzes exist for employees only; /tasks answers 403 to individuals.
    var assigned = const <AssignedQuiz>[];
    if (auth.user?.isEmployee == true) {
      try {
        assigned = await data.myAssignedQuizzes();
      } catch (_) {
        extrasFailed = true;
      }
    }

    return _QuizzesData(library: library, mine: mine, assigned: assigned, extrasFailed: extrasFailed);
  }

  Future<void> _open(QuizSummary quiz) async {
    if (quiz.isLocked) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This quiz is not available on your current plan.')),
      );
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => QuizSessionScreen(quizId: quiz.id, title: quiz.title),
      ),
    );
    if (mounted) await _controller.refresh();
  }

  static String _date(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return AsyncBody<_QuizzesData>(
      controller: _controller,
      isEmpty: (d) => d.library.isEmpty && d.mine.isEmpty && d.assigned.isEmpty,
      emptyTitle: 'No quizzes available',
      emptyIcon: Icons.quiz_outlined,
      builder: (context, data) => _buildList(data),
    );
  }

  Widget _buildList(_QuizzesData data) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(title: 'Quizzes', subtitle: 'Test what you have learned'),
        const SizedBox(height: 16),
        if (data.extrasFailed) ...[
          const Text(
            'Some personal quizzes could not be loaded. Pull down to try again.',
            style: TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
          const SizedBox(height: 12),
        ],
        if (data.assigned.isNotEmpty) ...[
          const _SectionLabel('Assigned to you'),
          for (final item in data.assigned)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _QuizCard(
                quiz: item.quiz,
                titleOverride: item.title,
                badge: item.dueDate == null ? 'Assigned' : 'Due ${_date(item.dueDate!)}',
                badgeColor: AppColors.yellow,
                onTap: () => _open(item.quiz),
              ),
            ),
          const SizedBox(height: 8),
        ],
        if (data.mine.isNotEmpty) ...[
          const _SectionLabel('Made for you'),
          for (final quiz in data.mine)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _QuizCard(
                quiz: quiz,
                badge: quiz.attackType == null ? 'After a simulation' : 'After a ${quiz.attackType} simulation',
                badgeColor: AppColors.purple,
                onTap: () => _open(quiz),
              ),
            ),
          const SizedBox(height: 8),
        ],
        if (data.library.isNotEmpty) ...[
          const _SectionLabel('Quiz library'),
          for (final quiz in data.library)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _QuizCard(quiz: quiz, onTap: () => _open(quiz)),
            ),
        ],
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
    );
  }
}

class _QuizCard extends StatelessWidget {
  const _QuizCard({
    required this.quiz,
    required this.onTap,
    this.titleOverride,
    this.badge,
    this.badgeColor = AppColors.purple,
  });

  final QuizSummary quiz;
  final VoidCallback onTap;
  final String? titleOverride;
  final String? badge;
  final Color badgeColor;

  @override
  Widget build(BuildContext context) {
    final locked = quiz.isLocked;
    final color = locked ? AppColors.textMuted : AppColors.purple;
    final meta = [
      if (quiz.category.isNotEmpty) quiz.category,
      quiz.difficulty,
      if (quiz.totalQuestions > 0) '${quiz.totalQuestions} questions',
    ].join(' · ');

    return Opacity(
      opacity: locked ? 0.6 : 1,
      child: CyberCard(
        onTap: onTap,
        borderColor: color.withValues(alpha: 0.3),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
              child: Icon(locked ? Icons.lock_outline : Icons.quiz_outlined, color: color, size: 26),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    titleOverride ?? quiz.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(meta, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  if (badge != null) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: badgeColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: badgeColor.withValues(alpha: 0.35)),
                      ),
                      child: Text(badge!, style: TextStyle(fontSize: 10, color: badgeColor, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              locked ? 'Locked' : 'Start',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
            ),
          ],
        ),
      ),
    );
  }
}
