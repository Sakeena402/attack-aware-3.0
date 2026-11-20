// lib/services/video_progress_store.dart
import 'package:shared_preferences/shared_preferences.dart';

/// Remembers where a user stopped in a video, on this device only.
/// It never touches the backend's UserVideo records (those mean "completed").
/// The key includes the user id so two accounts on one phone do not mix.
class VideoProgressStore {
  const VideoProgressStore();

  static String keyFor(String userId, String videoId) => 'video_pos:$userId:$videoId';

  Future<Duration?> read(String userId, String videoId) async {
    final prefs = await SharedPreferences.getInstance();
    final ms = prefs.getInt(keyFor(userId, videoId));
    return ms == null ? null : Duration(milliseconds: ms);
  }

  Future<void> write(String userId, String videoId, Duration position) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(keyFor(userId, videoId), position.inMilliseconds);
  }

  Future<void> clear(String userId, String videoId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(keyFor(userId, videoId));
  }
}
