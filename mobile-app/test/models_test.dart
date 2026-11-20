import 'package:flutter_test/flutter_test.dart';

import 'package:attack_aware_3_mob_app/models/account_settings.dart';
import 'package:attack_aware_3_mob_app/models/leaderboard_entry.dart';
import 'package:attack_aware_3_mob_app/models/my_analytics.dart';
import 'package:attack_aware_3_mob_app/utils/json_helpers.dart';

void main() {
  group('json helpers', () {
    test('asInt reads numbers and numeric strings, falls back otherwise', () {
      expect(asInt(5), 5);
      expect(asInt(5.9), 5);
      expect(asInt('42'), 42);
      expect(asInt('x'), 0);
      expect(asInt(null, fallback: 7), 7);
      expect(asInt(double.nan), 0);
      expect(asIntOrNull(null), isNull);
    });

    test('asString treats null and empty as missing', () {
      expect(asString(null, fallback: 'x'), 'x');
      expect(asString('', fallback: 'x'), 'x');
      expect(asString(12), '12');
      expect(asStringOrNull(''), isNull);
    });

    test('asJsonMap and asJsonList ignore the wrong shapes', () {
      expect(asJsonMap('nope'), isEmpty);
      expect(asJsonMap(<Object, Object>{1: 'a'}), {'1': 'a'});
      expect(asJsonList('nope'), isEmpty);
      expect(asJsonList([1, 'a', {'k': 1}]).length, 1);
    });
  });

  group('LeaderboardEntry', () {
    test('parses a full row', () {
      final e = LeaderboardEntry.fromJson(<String, Object?>{
        '_id': 'r1',
        'userId': 'u1',
        'userName': 'Alice William',
        'department': 'IT',
        'score': 939,
        'badge': 'Security Expert',
        'rank': 2,
        'trend': 'up',
      });
      expect(e.id, 'r1');
      expect(e.userId, 'u1');
      expect(e.userName, 'Alice William');
      expect(e.score, 939);
      expect(e.rank, 2);
      expect(e.trend, LeaderboardTrend.up);
    });

    test('missing fields get safe defaults', () {
      final e = LeaderboardEntry.fromJson(<String, Object?>{'userId': 'u9'});
      expect(e.id, 'u9');
      expect(e.userName, 'Unknown');
      expect(e.department, 'General');
      expect(e.badge, 'Rookie');
      expect(e.score, 0);
      expect(e.trend, LeaderboardTrend.stable);
    });
  });

  group('MyAnalytics', () {
    test('parses the /analytics/me shape', () {
      final a = MyAnalytics.fromJson(<String, Object?>{
        'user': {'points': 939, 'badge': 'Security Expert', 'riskScore': 11, 'riskLevel': 'low'},
        'stats': {'totalSimulations': 10, 'clicks': 2, 'credentials': 1, 'reports': 2},
        'ranking': {'rank': 2, 'percentile': 97},
        'history': [
          {
            'date': '2026-11-01T10:00:00.000Z',
            'campaignName': 'Payroll',
            'type': 'email',
            'action': 'reported',
            'pointsEarned': 50,
          },
        ],
      });
      expect(a.user.points, 939);
      expect(a.user.riskLevel, 'low');
      expect(a.stats.totalSimulations, 10);
      expect(a.ranking.rank, 2);
      expect(a.ranking.percentile, 97);
      expect(a.history.single.action, SimulationAction.reported);
      expect(a.history.single.date, isNotNull);
    });

    test('an individual user with no ranking keeps rank and percentile null', () {
      final a = MyAnalytics.fromJson(<String, Object?>{
        'user': {'points': 0},
        'stats': <String, Object?>{},
        'ranking': {'rank': null, 'percentile': null},
        'history': <Object?>[],
      });
      expect(a.ranking.rank, isNull);
      expect(a.ranking.percentile, isNull);
      expect(a.user.badge, 'Rookie');
      expect(a.history, isEmpty);
    });

    test('an empty payload does not throw', () {
      final a = MyAnalytics.fromJson(<String, Object?>{});
      expect(a.user.points, 0);
      expect(a.stats.clicks, 0);
      expect(a.history, isEmpty);
    });

    test('an unknown simulation action counts as ignored', () {
      expect(SimulationAction.parse('something-new'), SimulationAction.ignored);
      expect(SimulationAction.parse(null), SimulationAction.ignored);
      expect(SimulationAction.parse('clicked'), SimulationAction.clicked);
    });
  });

  group('AccountSettings', () {
    test('missing fields stay null', () {
      final s = AccountSettings.fromJson(<String, Object?>{'name': 'Alice'});
      expect(s.name, 'Alice');
      expect(s.phoneNumber, isNull);
      expect(s.department, isNull);
    });
  });
}
