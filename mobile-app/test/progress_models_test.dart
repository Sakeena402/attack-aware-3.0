import 'package:flutter_test/flutter_test.dart';

import 'package:attack_aware_3_mob_app/models/progress_models.dart';
import 'package:attack_aware_3_mob_app/models/quiz_models.dart';
import 'package:attack_aware_3_mob_app/utils/date_format.dart';

ProgressSummary _summary({
  List<Map<String, Object?>> games = const [],
  List<Map<String, Object?>> quizzes = const [],
  List<Map<String, Object?>> videos = const [],
}) {
  return ProgressSummary.fromJson(<String, Object?>{
    'history': {'games': games, 'quizzes': quizzes, 'videos': videos},
  });
}

void main() {
  group('ProgressSummary', () {
    test('parses the /progress/me payload', () {
      final progress = ProgressSummary.fromJson(<String, Object?>{
        'points': 994,
        'badge': 'Security Expert',
        'riskScore': 11,
        'riskLevel': 'low',
        'videosCompleted': 3,
        'quizzesTaken': 5,
        'gamesPlayed': 2,
        'history': {
          'games': [
            {'game_title': 'Hangman', 'score': 80, 'played_at': '2026-11-10T10:00:00.000Z'},
          ],
          'quizzes': [
            {'quiz_title': 'Basics', 'score': 7, 'attempted_at': '2026-11-11T10:00:00.000Z'},
          ],
          'videos': [
            {'video_id': 'en-1', 'status': 'Completed', 'watched_at': '2026-11-12T10:00:00.000Z'},
          ],
        },
      });
      expect(progress.points, 994);
      expect(progress.badge, 'Security Expert');
      expect(progress.videosCompleted, 3);
      expect(progress.quizAttempts, 5);
      expect(progress.gamesPlayed, 2);
      expect(progress.games.single.gameTitle, 'Hangman');
      expect(progress.quizzes.single.score, 7);
      expect(progress.videos.single.isCompleted, isTrue);
    });

    test('an empty payload does not throw and shows zeros', () {
      final progress = ProgressSummary.fromJson(<String, Object?>{});
      expect(progress.points, 0);
      expect(progress.badge, 'Rookie');
      expect(progress.games, isEmpty);
      expect(progress.quizzes, isEmpty);
      expect(progress.videos, isEmpty);
    });
  });

  group('buildActivityFeed', () {
    String title(String id) => 'Video $id';

    test('mixes the three histories, newest first', () {
      final feed = buildActivityFeed(
        _summary(
          games: [
            {'game_title': 'Hangman', 'score': 80, 'played_at': '2026-11-10T10:00:00.000Z'},
          ],
          quizzes: [
            {'quiz_title': 'Basics', 'score': 7, 'attempted_at': '2026-11-12T10:00:00.000Z'},
          ],
          videos: [
            {'video_id': 'en-1', 'status': 'Completed', 'watched_at': '2026-11-11T10:00:00.000Z'},
          ],
        ),
        videoTitle: title,
      );
      expect(feed.map((e) => e.kind), [ActivityKind.quiz, ActivityKind.video, ActivityKind.game]);
      expect(feed[1].title, 'Video en-1');
      expect(feed[0].detail, 'Quiz score: 7');
      expect(feed[2].detail, 'Game score: 80');
    });

    test('videos that were not completed are left out', () {
      final feed = buildActivityFeed(
        _summary(videos: [
          {'video_id': 'en-1', 'status': 'Incomplete', 'watched_at': '2026-11-11T10:00:00.000Z'},
        ]),
        videoTitle: title,
      );
      expect(feed, isEmpty);
    });

    test('items without a date go last', () {
      final feed = buildActivityFeed(
        _summary(quizzes: [
          {'quiz_title': 'No date', 'score': 1},
          {'quiz_title': 'Dated', 'score': 2, 'attempted_at': '2026-11-12T10:00:00.000Z'},
        ]),
        videoTitle: title,
      );
      expect(feed.map((e) => e.title), ['Dated', 'No date']);
    });

    test('the limit is respected', () {
      final feed = buildActivityFeed(
        _summary(quizzes: [
          for (var i = 1; i <= 30; i++)
            {'quiz_title': 'Q$i', 'score': i, 'attempted_at': '2026-11-${(i % 28 + 1).toString().padLeft(2, '0')}T10:00:00.000Z'},
        ]),
        videoTitle: title,
        limit: 20,
      );
      expect(feed.length, 20);
    });
  });

  group('isOverdue', () {
    final now = DateTime(2026, 11, 21);

    test('a past due date is overdue', () {
      expect(isOverdue(DateTime(2026, 10, 15), now: now), isTrue);
    });

    test('a future due date is not overdue', () {
      expect(isOverdue(DateTime(2026, 11, 30), now: now), isFalse);
    });

    test('no due date is never overdue', () {
      expect(isOverdue(null, now: now), isFalse);
    });
  });

  test('formatDate pads month and day', () {
    expect(formatDate(DateTime(2026, 3, 5)), '2026-03-05');
  });
}
