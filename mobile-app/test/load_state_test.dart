import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:attack_aware_3_mob_app/services/api_client.dart';
import 'package:attack_aware_3_mob_app/utils/error_message.dart';
import 'package:attack_aware_3_mob_app/utils/load_state.dart';

void main() {
  group('describeError', () {
    test('uses the ApiException message as is', () {
      expect(describeError(ApiException('Not allowed', statusCode: 403)), 'Not allowed');
    });

    test('hides raw errors behind a generic message', () {
      expect(describeError(StateError('boom')), 'Something went wrong. Please try again.');
    });
  });

  group('LoadController', () {
    test('starts in progress, then succeeds', () async {
      final c = LoadController<int>(() async => 7);
      expect(c.state, isA<LoadInProgress<int>>());
      await c.load();
      expect((c.state as LoadSuccess<int>).data, 7);
    });

    test('failure carries a readable message', () async {
      final c = LoadController<int>(() async => throw ApiException('Server down', statusCode: 500));
      await c.load();
      expect((c.state as LoadFailure<int>).message, 'Server down');
    });

    test('refresh failure keeps the data and reports the error once', () async {
      var calls = 0;
      final c = LoadController<int>(() async {
        calls++;
        if (calls == 1) return 1;
        throw ApiException('offline');
      });
      await c.load();
      await c.refresh();
      expect((c.state as LoadSuccess<int>).data, 1);
      expect(c.takeRefreshError(), 'offline');
      expect(c.takeRefreshError(), isNull);
    });

    test('retry after a failure can succeed', () async {
      var calls = 0;
      final c = LoadController<int>(() async {
        calls++;
        if (calls == 1) throw ApiException('first try failed');
        return 5;
      });
      await c.load();
      expect(c.state, isA<LoadFailure<int>>());
      await c.load();
      expect((c.state as LoadSuccess<int>).data, 5);
    });

    test('a stale response is ignored', () async {
      final first = Completer<int>();
      final second = Completer<int>();
      final completers = [first, second];
      var call = 0;
      final c = LoadController<int>(() => completers[call++].future);

      final a = c.load();
      final b = c.load();
      second.complete(2);
      await b;
      first.complete(1);
      await a;

      expect((c.state as LoadSuccess<int>).data, 2);
    });

    test('finishing after dispose does not throw', () async {
      final done = Completer<int>();
      final c = LoadController<int>(() => done.future);
      final f = c.load();
      c.dispose();
      done.complete(1);
      await f;
    });
  });
}
