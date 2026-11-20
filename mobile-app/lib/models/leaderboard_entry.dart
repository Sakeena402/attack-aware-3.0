// lib/models/leaderboard_entry.dart
import '../utils/json_helpers.dart';

enum LeaderboardTrend {
  up,
  down,
  stable;

  static LeaderboardTrend parse(String? value) {
    switch (value) {
      case 'up':
        return LeaderboardTrend.up;
      case 'down':
        return LeaderboardTrend.down;
      default:
        return LeaderboardTrend.stable;
    }
  }
}

/// One row of GET /api/leaderboard (employees only).
class LeaderboardEntry {
  const LeaderboardEntry({
    required this.id,
    required this.userId,
    required this.userName,
    required this.department,
    required this.score,
    required this.badge,
    required this.rank,
    required this.trend,
  });

  final String id;
  final String userId;
  final String userName;
  final String department;
  final int score;
  final String badge;
  final int rank;
  final LeaderboardTrend trend;

  factory LeaderboardEntry.fromJson(JsonMap json) {
    final userId = asString(json['userId']);
    return LeaderboardEntry(
      id: asString(json['_id'], fallback: userId),
      userId: userId,
      userName: asString(json['userName'], fallback: 'Unknown'),
      department: asString(json['department'], fallback: 'General'),
      score: asInt(json['score']),
      badge: asString(json['badge'], fallback: 'Rookie'),
      rank: asInt(json['rank']),
      trend: LeaderboardTrend.parse(asStringOrNull(json['trend'])),
    );
  }
}
