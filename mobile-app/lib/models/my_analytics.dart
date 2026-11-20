// lib/models/my_analytics.dart
import '../utils/json_helpers.dart';

/// What happened in one phishing / smishing / vishing simulation.
enum SimulationAction {
  reported,
  compromised,
  clicked,
  engaged,
  ignored;

  /// Unknown values count as "ignored", the same as the website.
  static SimulationAction parse(String? value) {
    for (final action in SimulationAction.values) {
      if (action.name == value) return action;
    }
    return SimulationAction.ignored;
  }
}

class AnalyticsUser {
  const AnalyticsUser({
    required this.points,
    required this.badge,
    required this.riskScore,
    required this.riskLevel,
  });

  final int points;
  final String badge;
  final int riskScore;
  final String riskLevel;

  factory AnalyticsUser.fromJson(JsonMap json) => AnalyticsUser(
        points: asInt(json['points']),
        badge: asString(json['badge'], fallback: 'Rookie'),
        riskScore: asInt(json['riskScore']),
        riskLevel: asString(json['riskLevel'], fallback: 'low'),
      );
}

class AnalyticsStats {
  const AnalyticsStats({
    required this.totalSimulations,
    required this.clicks,
    required this.credentials,
    required this.reports,
  });

  final int totalSimulations;
  final int clicks;
  final int credentials;
  final int reports;

  factory AnalyticsStats.fromJson(JsonMap json) => AnalyticsStats(
        totalSimulations: asInt(json['totalSimulations']),
        clicks: asInt(json['clicks']),
        credentials: asInt(json['credentials']),
        reports: asInt(json['reports']),
      );
}

/// rank and percentile are null when the backend cannot rank the user
/// (for example an individual user without a company).
class AnalyticsRanking {
  const AnalyticsRanking({this.rank, this.percentile});

  final int? rank;
  final int? percentile;

  factory AnalyticsRanking.fromJson(JsonMap json) => AnalyticsRanking(
        rank: asIntOrNull(json['rank']),
        percentile: asIntOrNull(json['percentile']),
      );
}

class SimulationHistoryItem {
  const SimulationHistoryItem({
    required this.action,
    required this.pointsEarned,
    required this.campaignName,
    required this.type,
    this.date,
  });

  final SimulationAction action;
  final int pointsEarned;
  final String campaignName;
  final String type;
  final DateTime? date;

  factory SimulationHistoryItem.fromJson(JsonMap json) => SimulationHistoryItem(
        action: SimulationAction.parse(asStringOrNull(json['action'])),
        pointsEarned: asInt(json['pointsEarned']),
        campaignName: asString(json['campaignName'], fallback: 'Unknown'),
        type: asString(json['type'], fallback: 'unknown'),
        date: DateTime.tryParse(asString(json['date'])),
      );
}

/// GET /api/analytics/me
class MyAnalytics {
  const MyAnalytics({
    required this.user,
    required this.stats,
    required this.ranking,
    required this.history,
  });

  final AnalyticsUser user;
  final AnalyticsStats stats;
  final AnalyticsRanking ranking;
  final List<SimulationHistoryItem> history;

  factory MyAnalytics.fromJson(JsonMap json) => MyAnalytics(
        user: AnalyticsUser.fromJson(asJsonMap(json['user'])),
        stats: AnalyticsStats.fromJson(asJsonMap(json['stats'])),
        ranking: AnalyticsRanking.fromJson(asJsonMap(json['ranking'])),
        history: asJsonList(json['history']).map(SimulationHistoryItem.fromJson).toList(),
      );
}
