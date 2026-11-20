import 'package:flutter_test/flutter_test.dart';

import 'package:attack_aware_3_mob_app/models/quiz_models.dart';

void main() {
  group('QuizOption', () {
    test('parses a to d and rejects anything else', () {
      expect(QuizOption.tryParse('a'), QuizOption.a);
      expect(QuizOption.tryParse('d'), QuizOption.d);
      expect(QuizOption.tryParse('e'), isNull);
      expect(QuizOption.tryParse(null), isNull);
      expect(QuizOption.c.label, 'C');
    });
  });

  group('QuizSummary', () {
    test('parses a library quiz with its lock flag', () {
      final quiz = QuizSummary.fromJson(<String, Object?>{
        '_id': 'q1',
        'title': 'Cybersecurity Basics',
        'description': 'Start here',
        'category': 'Basics',
        'difficulty': 'easy',
        'totalQuestions': 10,
        'isLocked': true,
      });
      expect(quiz.id, 'q1');
      expect(quiz.totalQuestions, 10);
      expect(quiz.isLocked, isTrue);
      expect(quiz.isAiGenerated, isFalse);
    });

    test('missing fields get safe defaults and nothing is locked', () {
      final quiz = QuizSummary.fromJson(<String, Object?>{'_id': 'q2'});
      expect(quiz.title, 'Untitled quiz');
      expect(quiz.difficulty, 'medium');
      expect(quiz.isLocked, isFalse);
    });

    test('an adaptive quiz keeps the attack type from triggerContext', () {
      final quiz = QuizSummary.fromJson(
        <String, Object?>{
          '_id': 'q3',
          'title': 'After phishing',
          'triggerContext': {'attackType': 'phishing', 'eventType': 'linkClicked'},
        },
        isAiGenerated: true,
      );
      expect(quiz.isAiGenerated, isTrue);
      expect(quiz.attackType, 'phishing');
    });

    test('source ai_generated marks a quiz as AI generated', () {
      final quiz = QuizSummary.fromJson(<String, Object?>{'_id': 'q4', 'source': 'ai_generated'});
      expect(quiz.isAiGenerated, isTrue);
    });
  });

  group('AssignedQuiz.tryFromTaskJson', () {
    Map<String, Object?> task({String type = 'quiz', String status = 'pending', Object? content}) => {
          '_id': 't1',
          'title': 'Finish this week',
          'contentType': type,
          'status': status,
          'points': 25,
          'dueDate': '2026-11-30T00:00:00.000Z',
          'content': content ?? {'_id': 'q1', 'title': 'Phishing 101', 'totalQuestions': 5},
        };

    test('a pending quiz task becomes an assigned quiz', () {
      final item = AssignedQuiz.tryFromTaskJson(task())!;
      expect(item.taskId, 't1');
      expect(item.title, 'Finish this week');
      expect(item.points, 25);
      expect(item.dueDate, isNotNull);
      expect(item.quiz.id, 'q1');
    });

    test('video and game tasks are ignored', () {
      expect(AssignedQuiz.tryFromTaskJson(task(type: 'video')), isNull);
      expect(AssignedQuiz.tryFromTaskJson(task(type: 'game')), isNull);
    });

    test('a completed task is ignored', () {
      expect(AssignedQuiz.tryFromTaskJson(task(status: 'completed')), isNull);
    });

    test('a task whose quiz was deleted is ignored', () {
      final json = task()..['content'] = null;
      expect(AssignedQuiz.tryFromTaskJson(json), isNull);
    });
  });

  group('QuizPlay', () {
    test('parses questions with their options', () {
      final play = QuizPlay.fromJson(<String, Object?>{
        'quiz': {'id': 'q1', 'title': 'Basics', 'totalQuestions': 2},
        'questions': [
          {
            'id': 'a1',
            'question': 'What is phishing?',
            'options': {'a': 'A scam', 'b': 'A fish', 'c': 'A game', 'd': 'A tool'},
          },
          {
            'id': 'a2',
            'question': 'Two options only',
            'options': {'a': 'Yes', 'b': 'No'},
          },
        ],
      });
      expect(play.title, 'Basics');
      expect(play.questions.length, 2);
      expect(play.questions.first.options[QuizOption.b], 'A fish');
      expect(play.questions.last.options.length, 2);
    });

    test('a question that cannot be answered is dropped', () {
      final play = QuizPlay.fromJson(<String, Object?>{
        'quiz': {'id': 'q1'},
        'questions': [
          {'id': '', 'question': 'No id', 'options': {'a': 'x', 'b': 'y'}},
          {'id': 'a2', 'question': 'One option', 'options': {'a': 'x'}},
        ],
      });
      expect(play.questions, isEmpty);
    });

    test('the play payload carries no answer fields', () {
      final question = QuizQuestion.fromJson(<String, Object?>{
        'id': 'a1',
        'question': 'Q',
        'options': {'a': '1', 'b': '2'},
        'correctOption': 'a',
        'explanation': 'secret',
      });
      expect(question.options.keys, [QuizOption.a, QuizOption.b]);
    });
  });

  group('QuizResult', () {
    test('parses a result with review items', () {
      final result = QuizResult.fromJson(<String, Object?>{
        'score': 7,
        'totalQuestions': 10,
        'passed': true,
        'pointsEarned': 15,
        'review': [
          {'questionId': 'a1', 'selected': 'a', 'correctOption': 'b', 'isCorrect': false, 'explanation': null},
          {'questionId': 'a2', 'selected': 'c', 'correctOption': 'c', 'isCorrect': true, 'explanation': 'Because'},
        ],
      });
      expect(result.score, 7);
      expect(result.percent, 70);
      expect(result.passed, isTrue);
      expect(result.pointsEarned, 15);
      expect(result.review.length, 2);
      expect(result.reviewByQuestion['a1']!.correct, QuizOption.b);
      expect(result.reviewByQuestion['a1']!.explanation, isNull);
      expect(result.reviewByQuestion['a2']!.explanation, 'Because');
    });

    test('a response without review is still valid', () {
      final result = QuizResult.fromJson(<String, Object?>{
        'score': 0,
        'totalQuestions': 10,
        'passed': false,
        'pointsEarned': 3,
      });
      expect(result.review, isEmpty);
      expect(result.percent, 0);
    });

    test('percent is 0 when the quiz has no questions', () {
      final result = QuizResult.fromJson(<String, Object?>{'score': 0, 'totalQuestions': 0});
      expect(result.percent, 0);
    });
  });

  group('answersToWire', () {
    test('turns choices into the letters the backend expects', () {
      expect(
        answersToWire({'q1': QuizOption.a, 'q2': QuizOption.d}),
        {'q1': 'a', 'q2': 'd'},
      );
    });
  });
}
