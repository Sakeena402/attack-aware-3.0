// lib/models/up_next.dart
import '../data/video_catalog.dart';
import '../utils/date_format.dart';
import 'quiz_models.dart';

enum UpNextKind { assignedQuiz, adaptiveQuiz, video }

/// One thing the learner should do next, with what is needed to open it.
class UpNextItem {
  const UpNextItem({
    required this.kind,
    required this.title,
    required this.subtitle,
    this.isOverdue = false,
    this.quizId,
    this.video,
  });

  final UpNextKind kind;
  final String title;
  final String subtitle;
  final bool isOverdue;

  /// Set for quiz items.
  final String? quizId;

  /// Set for the video item.
  final CatalogVideo? video;
}

/// Builds the "Up next" list: assigned quizzes (earliest due date first, so
/// overdue ones lead), then quizzes made for the learner, then the first
/// video that is not completed yet.
///
/// [completedVideoIds] is null when the completed list could not be loaded; no
/// video is suggested then, because it might already be watched.
List<UpNextItem> buildUpNext({
  required List<AssignedQuiz> assigned,
  required List<QuizSummary> mine,
  required Set<String>? completedVideoIds,
  required List<CatalogVideo> catalog,
  DateTime? now,
  int maxAssigned = 3,
  int maxAdaptive = 2,
}) {
  final clock = now ?? DateTime.now();
  final items = <UpNextItem>[];

  final sorted = [...assigned]..sort((a, b) {
      final first = a.dueDate;
      final second = b.dueDate;
      if (first == null && second == null) return 0;
      if (first == null) return 1;
      if (second == null) return -1;
      return first.compareTo(second);
    });

  for (final item in sorted.take(maxAssigned)) {
    final due = item.dueDate;
    final overdue = isOverdue(due, now: clock);
    items.add(
      UpNextItem(
        kind: UpNextKind.assignedQuiz,
        title: item.title,
        subtitle: due == null ? 'Assigned to you' : '${overdue ? 'Overdue' : 'Due'} ${formatDate(due)}',
        isOverdue: overdue,
        quizId: item.quiz.id,
      ),
    );
  }

  final assignedIds = {for (final item in assigned) item.quiz.id};
  var adaptiveCount = 0;
  for (final quiz in mine) {
    if (adaptiveCount >= maxAdaptive) break;
    if (assignedIds.contains(quiz.id)) continue;
    final attack = quiz.attackType;
    items.add(
      UpNextItem(
        kind: UpNextKind.adaptiveQuiz,
        title: quiz.title,
        subtitle: attack == null ? 'Made for you' : 'Made for you · after a $attack simulation',
        quizId: quiz.id,
      ),
    );
    adaptiveCount++;
  }

  if (completedVideoIds != null) {
    for (final video in catalog) {
      if (completedVideoIds.contains(video.id)) continue;
      items.add(
        UpNextItem(
          kind: UpNextKind.video,
          title: video.title,
          subtitle: 'Next training video · ${video.languageLabel}',
          video: video,
        ),
      );
      break;
    }
  }

  return items;
}
