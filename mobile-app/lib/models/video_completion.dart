// lib/models/video_completion.dart
import '../utils/json_helpers.dart';

/// One row of GET /api/videos/me/completed.
class VideoCompletion {
  const VideoCompletion({required this.videoId, this.watchedAt});

  final String videoId;
  final DateTime? watchedAt;

  factory VideoCompletion.fromJson(JsonMap json) => VideoCompletion(
        videoId: asString(json['videoId']),
        watchedAt: DateTime.tryParse(asString(json['watchedAt'])),
      );
}
