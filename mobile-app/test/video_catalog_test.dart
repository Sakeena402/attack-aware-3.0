import 'package:flutter_test/flutter_test.dart';

import 'package:attack_aware_3_mob_app/data/video_catalog.dart';
import 'package:attack_aware_3_mob_app/utils/constants.dart';

// These tests check the generated catalog (run tool/gen_video_catalog.mjs first).
void main() {
  test('the catalog is not empty', () {
    expect(kVideoCatalog, isNotEmpty);
  });

  test('every id is unique', () {
    final ids = kVideoCatalog.map((v) => v.id).toList();
    expect(ids.toSet().length, ids.length);
  });

  test('every video has a title and a file path under /videos/', () {
    for (final video in kVideoCatalog) {
      expect(video.title, isNotEmpty, reason: video.id);
      expect(video.filePath.startsWith('/videos/'), isTrue, reason: video.id);
    }
  });

  test('every file path turns into a valid https or http URL', () {
    for (final video in kVideoCatalog) {
      final uri = VideoConstants.urlFor(video.filePath);
      expect(uri.hasScheme, isTrue, reason: video.id);
      expect(uri.host, isNotEmpty, reason: video.id);
      expect(uri.toString().contains(' '), isFalse, reason: video.id);
    }
  });

  test('language codes from the website become readable names', () {
    const english = CatalogVideo(id: 'en-1', title: 't', description: '', category: '', language: 'en', filePath: '/videos/a.mp4');
    const urdu = CatalogVideo(id: 'ur-1', title: 't', description: '', category: '', language: 'ur', filePath: '/videos/b.mp4');
    const unknown = CatalogVideo(id: 'x-1', title: 't', description: '', category: '', language: '', filePath: '/videos/c.mp4');
    expect(english.languageLabel, 'English');
    expect(urdu.languageLabel, 'Urdu');
    expect(unknown.languageLabel, 'English');
  });

  test('every video has a language label', () {
    for (final video in kVideoCatalog) {
      expect(video.languageLabel, isNotEmpty, reason: video.id);
    }
  });
}
