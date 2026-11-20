// lib/screens/quizzes/quiz_session_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/quiz_models.dart';
import '../../services/api_client.dart';
import '../../services/auth_provider.dart';
import '../../services/data_service.dart';
import '../../utils/app_theme.dart';
import '../../utils/load_state.dart';
import '../../widgets/async_body.dart';
import '../../widgets/common_widgets.dart';

/// Plays one quiz: loads the questions (no answers inside), collects the
/// learner's choices, submits once, then shows the score and a review with the
/// correct answers. Nothing is sent to the server until Submit. Leaving the
/// quiz halfway discards the answers (after a confirmation).
class QuizSessionScreen extends StatefulWidget {
  const QuizSessionScreen({super.key, required this.quizId, required this.title});

  final String quizId;
  final String title;

  @override
  State<QuizSessionScreen> createState() => _QuizSessionScreenState();
}

class _QuizSessionScreenState extends State<QuizSessionScreen> {
  late final DataService _data;
  late final LoadController<QuizPlay> _play;

  final Map<String, QuizOption> _answers = {};
  int _index = 0;
  bool _submitting = false;
  String? _submitError;
  QuizResult? _result;

  @override
  void initState() {
    super.initState();
    _data = context.read<AuthProvider>().data;
    _play = LoadController<QuizPlay>(() => _data.playQuiz(widget.quizId))..load();
  }

  @override
  void dispose() {
    _play.dispose();
    super.dispose();
  }

  /// Answers would be lost if the learner left now.
  bool get _blocksLeaving => _result == null && _answers.isNotEmpty;

  Future<void> _confirmLeave() async {
    final leave = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Leave this quiz?'),
        content: const Text('Your answers will be discarded.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Keep going')),
          TextButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Leave')),
        ],
      ),
    );
    if (leave == true && mounted) Navigator.of(context).pop();
  }

  Future<void> _submit() async {
    if (_submitting) return; // a second tap while the first is running does nothing
    setState(() {
      _submitting = true;
      _submitError = null;
    });
    try {
      final result = await _data.submitQuiz(widget.quizId, Map<String, QuizOption>.of(_answers));
      if (!mounted) return;
      setState(() => _result = result);
    } on ApiException catch (e) {
      if (mounted) setState(() => _submitError = e.message);
    } catch (_) {
      if (mounted) setState(() => _submitError = "Couldn't submit your answers. Please try again.");
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_blocksLeaving,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop || _submitting) return; // never leave while the answers are being sent
        _confirmLeave();
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: Text(_result == null ? widget.title : 'Result', maxLines: 1, overflow: TextOverflow.ellipsis)),
        body: AsyncBody<QuizPlay>(
          controller: _play,
          isEmpty: (play) => play.questions.isEmpty,
          emptyTitle: 'This quiz has no questions yet',
          emptyIcon: Icons.quiz_outlined,
          builder: (context, play) {
            final result = _result;
            return result == null ? _buildQuestion(play) : _buildResult(play, result);
          },
        ),
      ),
    );
  }

  // ── question page ──────────────────────────────────────────────────────────

  Widget _buildQuestion(QuizPlay play) {
    final total = play.questions.length;
    final index = _index < total ? _index : total - 1;
    final question = play.questions[index];
    final selected = _answers[question.id];
    final isLast = index == total - 1;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        Text('Question ${index + 1} of $total', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
        const SizedBox(height: 8),
        AnimatedProgressBar(value: (index + 1) / total, color: AppColors.purple),
        const SizedBox(height: 20),
        Text(question.text, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 16),
        for (final entry in question.options.entries)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _OptionTile(
              label: entry.key.label,
              text: entry.value,
              selected: selected == entry.key,
              onTap: _submitting ? null : () => setState(() => _answers[question.id] = entry.key),
            ),
          ),
        if (_submitError != null) ...[
          const SizedBox(height: 6),
          _Banner(icon: Icons.error_outline, color: AppColors.red, text: _submitError!),
        ],
        const SizedBox(height: 12),
        Row(
          children: [
            if (index > 0)
              OutlinedButton(
                onPressed: _submitting ? null : () => setState(() {
                      _index = index - 1;
                      _submitError = null;
                    }),
                child: const Text('Back'),
              ),
            const Spacer(),
            FilledButton(
              onPressed: selected == null || _submitting ? null : (isLast ? _submit : () => setState(() => _index = index + 1)),
              child: _submitting
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(isLast ? (_submitError == null ? 'Submit' : 'Try again') : 'Next'),
            ),
          ],
        ),
      ],
    );
  }

  // ── result page ────────────────────────────────────────────────────────────

  Widget _buildResult(QuizPlay play, QuizResult result) {
    final color = result.passed ? AppColors.green : AppColors.yellow;
    final byQuestion = result.reviewByQuestion;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        CyberCard(
          borderColor: color.withValues(alpha: 0.4),
          child: Column(
            children: [
              Icon(result.passed ? Icons.emoji_events : Icons.flag_outlined, size: 44, color: color),
              const SizedBox(height: 10),
              Text('${result.score} / ${result.totalQuestions}',
                  style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: color)),
              Text('${result.percent.round()}%', style: const TextStyle(fontSize: 14, color: AppColors.textMuted)),
              const SizedBox(height: 8),
              Text(
                result.passed ? 'Passed' : 'Not passed yet (60% needed)',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: color),
              ),
              if (result.pointsEarned > 0) ...[
                const SizedBox(height: 6),
                Text('+${result.pointsEarned} points', style: const TextStyle(fontSize: 13, color: AppColors.purple)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Text('Review', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 10),
        if (result.review.isEmpty)
          const Text("The answer review isn't available for this quiz.", style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
        for (var i = 0; i < play.questions.length; i++)
          if (byQuestion[play.questions[i].id] case final item?)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _ReviewCard(number: i + 1, question: play.questions[i], item: item),
            ),
        const SizedBox(height: 8),
        FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Done')),
      ],
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({required this.label, required this.text, required this.selected, required this.onTap});

  final String label;
  final String text;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.purple : AppColors.border;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? AppColors.purple.withValues(alpha: 0.15) : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color, width: selected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: BoxDecoration(shape: BoxShape.circle, color: selected ? AppColors.purple : Colors.transparent, border: Border.all(color: color)),
              child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: selected ? Colors.white : AppColors.textMuted)),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(text, style: const TextStyle(fontSize: 14, color: AppColors.textPrimary))),
          ],
        ),
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.number, required this.question, required this.item});

  final int number;
  final QuizQuestion question;
  final QuizReviewItem item;

  String _answerText(QuizOption? option) {
    if (option == null) return 'Not answered';
    final text = question.options[option];
    return text == null ? option.label : '${option.label}. $text';
  }

  @override
  Widget build(BuildContext context) {
    final color = item.isCorrect ? AppColors.green : AppColors.red;
    final explanation = item.explanation;
    return CyberCard(
      borderColor: color.withValues(alpha: 0.35),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(item.isCorrect ? Icons.check_circle_outline : Icons.cancel_outlined, color: color, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text('$number. ${question.text}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Your answer: ${_answerText(item.selected)}', style: TextStyle(fontSize: 12, color: color)),
          if (!item.isCorrect && item.correct != null) ...[
            const SizedBox(height: 4),
            Text('Correct answer: ${_answerText(item.correct)}', style: const TextStyle(fontSize: 12, color: AppColors.green)),
          ],
          if (explanation != null) ...[
            const SizedBox(height: 6),
            Text(explanation, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ],
        ],
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.icon, required this.color, required this.text});

  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
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
        ],
      ),
    );
  }
}
