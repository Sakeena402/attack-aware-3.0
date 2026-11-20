import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:attack_aware_3_mob_app/services/video_progress_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const store = VideoProgressStore();

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('nothing saved reads as null', () async {
    expect(await store.read('u1', 'en-1'), isNull);
  });

  test('write then read returns the same position', () async {
    await store.write('u1', 'en-1', const Duration(seconds: 42));
    expect(await store.read('u1', 'en-1'), const Duration(seconds: 42));
  });

  test('two users on one phone do not share progress', () async {
    await store.write('u1', 'en-1', const Duration(seconds: 10));
    await store.write('u2', 'en-1', const Duration(seconds: 70));
    expect(await store.read('u1', 'en-1'), const Duration(seconds: 10));
    expect(await store.read('u2', 'en-1'), const Duration(seconds: 70));
  });

  test('clear removes only that video', () async {
    await store.write('u1', 'en-1', const Duration(seconds: 10));
    await store.write('u1', 'en-2', const Duration(seconds: 20));
    await store.clear('u1', 'en-1');
    expect(await store.read('u1', 'en-1'), isNull);
    expect(await store.read('u1', 'en-2'), const Duration(seconds: 20));
  });
}
