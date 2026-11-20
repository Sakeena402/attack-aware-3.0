// lib/utils/video_rules.dart
import '../services/api_client.dart';

const Duration kResumeMinimum = Duration(seconds: 5);
const Duration kResumeEndMargin = Duration(seconds: 5);

/// A 403 from /videos/:id/access or /videos/:id/watch means the plan's monthly
/// video allowance is used up (or videos are not part of the plan).
bool isPlanBlock(ApiException error) => error.statusCode == 403;

/// Where to continue from. Null means "start from the beginning": nothing
/// saved, saved too early to matter, or the video was almost finished.
Duration? resumePointFor(Duration? saved, Duration total) {
  if (saved == null) return null;
  if (saved < kResumeMinimum) return null;
  if (total - saved < kResumeEndMargin) return null;
  return saved;
}

/// Same idea as the website's onEnded check (`duration > 1`): only a video
/// longer than one second can finish, and it finishes at its end.
bool isPlaybackFinished(Duration position, Duration duration) {
  if (duration <= const Duration(seconds: 1)) return false;
  return position >= duration - const Duration(milliseconds: 300);
}
