import 'package:flutter_test/flutter_test.dart';

import 'package:attack_aware_3_mob_app/models/video_completion.dart';
import 'package:attack_aware_3_mob_app/services/api_client.dart';
import 'package:attack_aware_3_mob_app/utils/constants.dart';
import 'package:attack_aware_3_mob_app/utils/video_rules.dart';

void main() {
  group('isPlanBlock', () {
    test('only a 403 counts as a plan block', () {
      expect(isPlanBlock(ApiException('Monthly limit reached', statusCode: 403)), isTrue);
      expect(isPlanBlock(ApiException('Server error', statusCode: 500)), isFalse);
      expect(isPlanBlock(ApiException('Could not reach the server.')), isFalse);
    });
  });

  group('resumePointFor', () {
    const total = Duration(seconds: 90);

    test('nothing saved means start from the beginning', () {
      expect(resumePointFor(null, total), isNull);
    });

    test('a position under 5 seconds is ignored', () {
      expect(resumePointFor(const Duration(seconds: 3), total), isNull);
    });

    test('a normal position is kept', () {
      expect(resumePointFor(const Duration(seconds: 30), total), const Duration(seconds: 30));
    });

    test('an almost finished video starts over', () {
      expect(resumePointFor(const Duration(seconds: 88), total), isNull);
    });
  });

  group('isPlaybackFinished', () {
    test('finishes only at the end of a video longer than one second', () {
      const duration = Duration(seconds: 90);
      expect(isPlaybackFinished(const Duration(seconds: 45), duration), isFalse);
      expect(isPlaybackFinished(const Duration(seconds: 90), duration), isTrue);
      expect(isPlaybackFinished(const Duration(milliseconds: 89800), duration), isTrue);
    });

    test('a zero or tiny duration never finishes', () {
      expect(isPlaybackFinished(Duration.zero, Duration.zero), isFalse);
      expect(isPlaybackFinished(const Duration(milliseconds: 900), const Duration(milliseconds: 900)), isFalse);
    });
  });

  group('buildVideoUri', () {
    test('plain file name', () {
      final uri = buildVideoUri('https://attack-aware-30.vercel.app', '/videos/v1/phising attack.mp4');
      expect(uri.scheme, 'https');
      expect(uri.host, 'attack-aware-30.vercel.app');
      expect(uri.pathSegments, ['videos', 'v1', 'phising attack.mp4']);
      expect(uri.toString(), contains('phising%20attack.mp4'));
    });

    test('spaces, brackets and parentheses survive the round trip', () {
      final uri = buildVideoUri('https://example.com', '/videos/v2/OTP [Scam] (eng).mp4');
      expect(uri.toString().contains(' '), isFalse);
      expect(uri.pathSegments, ['videos', 'v2', 'OTP [Scam] (eng).mp4']);
    });

    test('a base URL with a path and a port keeps both', () {
      final uri = buildVideoUri('http://localhost:3000/base/', 'videos/a.mp4');
      expect(uri.port, 3000);
      expect(uri.pathSegments, ['base', 'videos', 'a.mp4']);
    });
  });

  group('VideoCompletion', () {
    test('parses the backend row', () {
      final item = VideoCompletion.fromJson(<String, Object?>{
        '_id': 'x',
        'videoId': 'en-1',
        'watchedAt': '2026-11-01T10:00:00.000Z',
      });
      expect(item.videoId, 'en-1');
      expect(item.watchedAt, isNotNull);
    });

    test('a row with missing fields does not throw', () {
      final item = VideoCompletion.fromJson(<String, Object?>{});
      expect(item.videoId, '');
      expect(item.watchedAt, isNull);
    });
  });
}
