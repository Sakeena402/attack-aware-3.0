// lib/models/progress_models.dart
import '../utils/json_helpers.dart';

class GameHistoryItem {
  const GameHistoryItem({required this.gameTitle, required this.score, this.playedAt});

  final String gameTitle;
  final int score;
  final DateTime? playedAt;

  factory GameHistoryItem.fromJson(JsonMap json) => GameHistoryItem(
        gameTitle: asString(json['game_title'], fallback: 'Game'),
        score: asInt(json['score']),
        playedAt: DateTime.tryParse(asString(json['played_at'])),
      );
}

class QuizHistoryItem {
  const QuizHistoryItem({required this.quizTitle, required this.score, this.attemptedAt});

  final String quizTitle;

  /// Number of correct answers (the backend does not send the total here).
  final int score;
  final DateTime? attemptedAt;

  factory QuizHistoryItem.fromJson(JsonMap json) => QuizHistoryItem(
        quizTitle: asString(json['quiz_title'], fallback: 'Quiz'),
        score: asInt(json['score']),
        attemptedAt: DateTime.tryParse(asString(json['attempted_at'])),
      );
}

class VideoHistoryItem {
  const VideoHistoryItem({required this.videoId, required this.status, this.watchedAt});

  final String videoId;
  final String status;
  final DateTime? watchedAt;

  bool get isCompleted => status == 'Completed';

  factory VideoHistoryItem.fromJson(JsonMap json) => VideoHistoryItem(
        videoId: asString(json['video_id']),
        status: asString(json['status']),
        watchedAt: DateTime.tryParse(asString(json['watched_at'])),
      );
}

/// GET /api/progress/me
class ProgressSummary {
  const ProgressSummary({
    required this.points,
    required this.badge,
    required this.riskScore,
    required this.riskLevel,
    required this.videosCompleted,
    required this.quizAttempts,
    required this.gamesPlayed,
    required this.games,
    required this.quizzes,
    required this.videos,
  });

  final int points;
  final String badge;
  final int riskScore;
  final String riskLevel;
  final int videosCompleted;

  /// Every submitted attempt counts, including repeats of the same quiz.
  final int quizAttempts;
  final int gamesPlayed;
  final List<GameHistoryItem> games;
  final List<QuizHistoryItem> quizzes;
  final List<VideoHistoryItem> videos;

  factory ProgressSummary.fromJson(JsonMap json) {
    final history = asJsonMap(json['history']);
    return ProgressSummary(
      points: asInt(json['points']),
      badge: asString(json['badge'], fallback: 'Rookie'),
      riskScore: asInt(json['riskScore']),
      riskLevel: asString(json['riskLevel'], fallback: 'low'),
      videosCompleted: asInt(json['videosCompleted']),
      quizAttempts: asInt(json['quizzesTaken']),
      gamesPlayed: asInt(json['gamesPlayed']),
      games: asJsonList(history['games']).map(GameHistoryItem.fromJson).toList(),
      quizzes: asJsonList(history['quizzes']).map(QuizHistoryItem.fromJson).toList(),
      videos: asJsonList(history['videos']).map(VideoHistoryItem.fromJson).toList(),
    );
  }
}

enum ActivityKind { video, quiz, game }

class ActivityItem {
  const ActivityItem({required this.kind, required this.title, required this.detail, this.when});

  final ActivityKind kind;
  final String title;
  final String detail;
  final DateTime? when;
}

/// One list of what the learner did recently, newest first. Items without a
/// date go last. Videos that were not completed are left out.
List<ActivityItem> buildActivityFeed(
  ProgressSummary progress, {
  required String Function(String videoId) videoTitle,
  int limit = 20,
}) {
  final items = <ActivityItem>[
    for (final video in progress.videos)
      if (video.isCompleted)
        ActivityItem(
          kind: ActivityKind.video,
          title: videoTitle(video.videoId),
          detail: 'Video completed',
          when: video.watchedAt,
        ),
    for (final quiz in progress.quizzes)
      ActivityItem(
        kind: ActivityKind.quiz,
        title: quiz.quizTitle,
        detail: 'Quiz score: ${quiz.score}',
        when: quiz.attemptedAt,
      ),
    for (final game in progress.games)
      ActivityItem(
        kind: ActivityKind.game,
        title: game.gameTitle,
        detail: 'Game score: ${game.score}',
        when: game.playedAt,
      ),
  ];

  items.sort((a, b) {
    final first = a.when;
    final second = b.when;
    if (first == null && second == null) return 0;
    if (first == null) return 1;
    if (second == null) return -1;
    return second.compareTo(first);
  });

  return items.take(limit).toList();
}
