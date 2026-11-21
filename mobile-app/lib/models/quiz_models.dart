// lib/models/quiz_models.dart
import '../utils/json_helpers.dart';

enum QuizOption {
  a,
  b,
  c,
  d;

  static QuizOption? tryParse(String? value) {
    for (final option in QuizOption.values) {
      if (option.name == value) return option;
    }
    return null;
  }

  String get label => name.toUpperCase();
}

/// One quiz in a list: GET /quizzes, GET /quizzes/mine, or the quiz inside an
/// assigned task.
class QuizSummary {
  const QuizSummary({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.difficulty,
    required this.totalQuestions,
    this.isLocked = false,
    this.isAiGenerated = false,
    this.attackType,
  });

  final String id;
  final String title;
  final String description;
  final String category;
  final String difficulty;
  final int totalQuestions;
  final bool isLocked;
  final bool isAiGenerated;
  final String? attackType;

  factory QuizSummary.fromJson(JsonMap json, {bool isAiGenerated = false}) {
    final trigger = asJsonMap(json['triggerContext']);
    return QuizSummary(
      id: asString(json['_id']),
      title: asString(json['title'], fallback: 'Untitled quiz'),
      description: asString(json['description']),
      category: asString(json['category']),
      difficulty: asString(json['difficulty'], fallback: 'medium'),
      totalQuestions: asInt(json['totalQuestions']),
      isLocked: json['isLocked'] == true,
      isAiGenerated: isAiGenerated || json['source'] == 'ai_generated',
      attackType: asStringOrNull(trigger['attackType']),
    );
  }
}

/// A quiz given to the signed-in employee by an admin (GET /tasks, quiz tasks
/// that are not completed yet).
class AssignedQuiz {
  const AssignedQuiz({
    required this.taskId,
    required this.title,
    required this.points,
    required this.quiz,
    this.dueDate,
  });

  final String taskId;
  final String title;
  final int points;
  final DateTime? dueDate;
  final QuizSummary quiz;

  /// Null for anything that is not a pending quiz task, or when the quiz
  /// itself no longer exists.
  static AssignedQuiz? tryFromTaskJson(JsonMap json) {
    if (asString(json['contentType']) != 'quiz') return null;
    if (asString(json['status']) == 'completed') return null;
    final content = asJsonMap(json['content']);
    if (content.isEmpty) return null;
    final quiz = QuizSummary.fromJson(content);
    if (quiz.id.isEmpty) return null;
    return AssignedQuiz(
      taskId: asString(json['_id']),
      title: asString(json['title'], fallback: quiz.title),
      points: asInt(json['points']),
      dueDate: DateTime.tryParse(asString(json['dueDate'])),
      quiz: quiz,
    );
  }
}

/// A question as the backend sends it for playing: text and options only,
/// never the correct answer.
class QuizQuestion {
  const QuizQuestion({required this.id, required this.text, required this.options});

  final String id;
  final String text;
  final Map<QuizOption, String> options;

  factory QuizQuestion.fromJson(JsonMap json) {
    final raw = asJsonMap(json['options']);
    final options = <QuizOption, String>{};
    for (final option in QuizOption.values) {
      final text = asStringOrNull(raw[option.name]);
      if (text != null) options[option] = text;
    }
    return QuizQuestion(id: asString(json['id']), text: asString(json['question']), options: options);
  }
}

/// GET /quizzes/:id/play
class QuizPlay {
  const QuizPlay({required this.id, required this.title, required this.questions});

  final String id;
  final String title;
  final List<QuizQuestion> questions;

  factory QuizPlay.fromJson(JsonMap json) {
    final quiz = asJsonMap(json['quiz']);
    return QuizPlay(
      id: asString(quiz['id']),
      title: asString(quiz['title'], fallback: 'Quiz'),
      // A question without an id or with fewer than two options cannot be answered.
      questions: asJsonList(json['questions'])
          .map(QuizQuestion.fromJson)
          .where((q) => q.id.isNotEmpty && q.options.length >= 2)
          .toList(),
    );
  }
}

/// One entry of the `review` list that POST /submit?review=true returns.
class QuizReviewItem {
  const QuizReviewItem({
    required this.questionId,
    required this.isCorrect,
    this.selected,
    this.correct,
    this.explanation,
  });

  final String questionId;
  final QuizOption? selected;
  final QuizOption? correct;
  final bool isCorrect;
  final String? explanation;

  factory QuizReviewItem.fromJson(JsonMap json) => QuizReviewItem(
        questionId: asString(json['questionId']),
        selected: QuizOption.tryParse(asStringOrNull(json['selected'])),
        correct: QuizOption.tryParse(asStringOrNull(json['correctOption'])),
        isCorrect: json['isCorrect'] == true,
        explanation: asStringOrNull(json['explanation']),
      );
}

/// POST /quizzes/:id/submit?review=true
class QuizResult {
  const QuizResult({
    required this.score,
    required this.totalQuestions,
    required this.passed,
    required this.pointsEarned,
    required this.review,
  });

  final int score;
  final int totalQuestions;
  final bool passed;
  final int pointsEarned;
  final List<QuizReviewItem> review;

  double get percent => totalQuestions > 0 ? score * 100 / totalQuestions : 0;

  Map<String, QuizReviewItem> get reviewByQuestion => {
        for (final item in review) item.questionId: item,
      };

  factory QuizResult.fromJson(JsonMap json) => QuizResult(
        score: asInt(json['score']),
        totalQuestions: asInt(json['totalQuestions']),
        passed: json['passed'] == true,
        pointsEarned: asInt(json['pointsEarned']),
        review: asJsonList(json['review']).map(QuizReviewItem.fromJson).toList(),
      );
}

/// True when a due date has already passed.
bool isOverdue(DateTime? due, {DateTime? now}) => due != null && due.isBefore(now ?? DateTime.now());

/// Body for POST /quizzes/:id/submit: { questionId: 'a' | 'b' | 'c' | 'd' }.
Map<String, String> answersToWire(Map<String, QuizOption> answers) => {
      for (final entry in answers.entries) entry.key: entry.value.name,
    };
