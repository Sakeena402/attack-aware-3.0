import 'package:flutter_test/flutter_test.dart';

import 'package:attack_aware_3_mob_app/data/video_catalog.dart';
import 'package:attack_aware_3_mob_app/models/quiz_models.dart';
import 'package:attack_aware_3_mob_app/models/up_next.dart';

AssignedQuiz _assigned(String id, DateTime? due) => AssignedQuiz(
      taskId: 't-$id',
      title: 'Assigned $id',
      points: 15,
      dueDate: due,
      quiz: QuizSummary(
        id: id,
        title: 'Quiz $id',
        description: '',
        category: '',
        difficulty: 'medium',
        totalQuestions: 5,
      ),
    );

QuizSummary _mine(String id, {String? attack}) => QuizSummary(
      id: id,
      title: 'Mine $id',
      description: '',
      category: '',
      difficulty: 'medium',
      totalQuestions: 5,
      isAiGenerated: true,
      attackType: attack,
    );

const _videos = [
  CatalogVideo(id: 'en-1', title: 'One', description: '', category: 'A', language: 'en', filePath: '/videos/1.mp4'),
  CatalogVideo(id: 'en-2', title: 'Two', description: '', category: 'A', language: 'en', filePath: '/videos/2.mp4'),
  CatalogVideo(id: 'ur-1', title: 'Teen', description: '', category: 'A', language: 'ur', filePath: '/videos/3.mp4'),
];

void main() {
  final now = DateTime(2026, 11, 21);

  group('assigned quizzes', () {
    test('the earliest due date comes first, so overdue ones lead', () {
      final items = buildUpNext(
        assigned: [
          _assigned('later', DateTime(2026, 12, 1)),
          _assigned('overdue', DateTime(2026, 10, 15)),
          _assigned('nodue', null),
        ],
        mine: const [],
        completedVideoIds: null,
        catalog: const [],
        now: now,
      );
      expect(items.map((e) => e.quizId), ['overdue', 'later', 'nodue']);
      expect(items.first.isOverdue, isTrue);
      expect(items.first.subtitle, 'Overdue 2026-10-15');
      expect(items[1].subtitle, 'Due 2026-12-01');
      expect(items[2].subtitle, 'Assigned to you');
    });

    test('only the first three are shown', () {
      final items = buildUpNext(
        assigned: [for (var i = 1; i <= 5; i++) _assigned('q$i', DateTime(2026, 12, i))],
        mine: const [],
        completedVideoIds: null,
        catalog: const [],
        now: now,
      );
      expect(items.length, 3);
    });
  });

  group('made for you', () {
    test('at most two are shown and the attack type is mentioned', () {
      final items = buildUpNext(
        assigned: const [],
        mine: [_mine('a', attack: 'phishing'), _mine('b'), _mine('c')],
        completedVideoIds: null,
        catalog: const [],
        now: now,
      );
      expect(items.length, 2);
      expect(items.first.subtitle, 'Made for you · after a phishing simulation');
      expect(items.last.subtitle, 'Made for you');
    });

    test('a quiz that is already assigned is not listed twice', () {
      final items = buildUpNext(
        assigned: [_assigned('same', DateTime(2026, 12, 1))],
        mine: [_mine('same'), _mine('other')],
        completedVideoIds: null,
        catalog: const [],
        now: now,
      );
      expect(items.map((e) => e.quizId), ['same', 'other']);
    });
  });

  group('next video', () {
    test('suggests the first video that is not completed', () {
      final items = buildUpNext(
        assigned: const [],
        mine: const [],
        completedVideoIds: {'en-1'},
        catalog: _videos,
        now: now,
      );
      expect(items.single.kind, UpNextKind.video);
      expect(items.single.video!.id, 'en-2');
    });

    test('nothing is suggested when every video is done', () {
      final items = buildUpNext(
        assigned: const [],
        mine: const [],
        completedVideoIds: {'en-1', 'en-2', 'ur-1'},
        catalog: _videos,
        now: now,
      );
      expect(items, isEmpty);
    });

    test('nothing is suggested when the completed list is unknown', () {
      final items = buildUpNext(
        assigned: const [],
        mine: const [],
        completedVideoIds: null,
        catalog: _videos,
        now: now,
      );
      expect(items, isEmpty);
    });
  });

  test('the order is assigned, then made for you, then the video', () {
    final items = buildUpNext(
      assigned: [_assigned('a', DateTime(2026, 12, 1))],
      mine: [_mine('m')],
      completedVideoIds: <String>{},
      catalog: _videos,
      now: now,
    );
    expect(items.map((e) => e.kind), [UpNextKind.assignedQuiz, UpNextKind.adaptiveQuiz, UpNextKind.video]);
  });

  test('everything empty gives an empty list', () {
    expect(
      buildUpNext(assigned: const [], mine: const [], completedVideoIds: <String>{}, catalog: const [], now: now),
      isEmpty,
    );
  });
}
