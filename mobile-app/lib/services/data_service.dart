// lib/services/data_service.dart
import '../models/account_settings.dart';
import '../models/leaderboard_entry.dart';
import '../models/my_analytics.dart';
import '../models/progress_models.dart';
import '../models/quiz_models.dart';
import '../models/video_completion.dart';
import '../utils/json_helpers.dart';
import 'api_client.dart';

/// Learner-facing calls only. Admin / super-admin features (campaigns,
/// employee and company management, admin analytics) live on the web
/// dashboard and are intentionally not part of the mobile app.
/// Every read returns a typed model, never a raw map.
class DataService {
  final ApiClient api;
  DataService(this.api);

  // ── GET /api/leaderboard  (employees only; individuals get HTTP 400) ───────
  Future<List<LeaderboardEntry>> leaderboard() async {
    final res = await api.get('/leaderboard?limit=100');
    return asJsonList(res['data']).map(LeaderboardEntry.fromJson).toList();
  }

  // ── GET /api/analytics/me ──────────────────────────────────────────────────
  Future<MyAnalytics> myAnalytics() async {
    final res = await api.get('/analytics/me');
    return MyAnalytics.fromJson(asJsonMap(res['data']));
  }

  // ── Settings / account ─────────────────────────────────────────────────────
  // GET /api/settings  → {name,email,department,phoneNumber,...} (not wrapped)
  Future<AccountSettings> settings() async {
    final res = await api.get('/settings');
    return AccountSettings.fromJson(asJsonMap(res));
  }

  // PUT /api/settings  (email and department are not sent from mobile)
  Future<void> updateSettings({required String name, required String phoneNumber}) async {
    await api.put('/settings', {'name': name.trim(), 'phoneNumber': phoneNumber.trim()});
  }

  // ── Progress ───────────────────────────────────────────────────────────────
  // GET /api/progress/me → totals plus the history of videos, quizzes and games
  Future<ProgressSummary> myProgress() async {
    final res = await api.get('/progress/me');
    return ProgressSummary.fromJson(asJsonMap(res['data']));
  }

  // ── Videos ─────────────────────────────────────────────────────────────────
  // GET /api/videos/me/completed → [{videoId, watchedAt}]
  Future<List<VideoCompletion>> myCompletedVideos() async {
    final res = await api.get('/videos/me/completed');
    return asJsonList(res['data']).map(VideoCompletion.fromJson).toList();
  }

  // GET /api/videos/:id/access → 200, or 403 when the plan allowance is used up
  Future<void> checkVideoAccess(String videoId) async {
    await api.get('/videos/${Uri.encodeComponent(videoId)}/access');
  }

  // POST /api/videos/:id/watch (no body, same as the website) marks it completed
  Future<void> markVideoWatched(String videoId) async {
    await api.post('/videos/${Uri.encodeComponent(videoId)}/watch');
  }

  // ── Quizzes ────────────────────────────────────────────────────────────────
  // GET /api/quizzes → static library with an isLocked flag
  Future<List<QuizSummary>> quizLibrary() async {
    final res = await api.get('/quizzes');
    return asJsonList(res['data']).map(QuizSummary.fromJson).toList();
  }

  // GET /api/quizzes/mine → adaptive quizzes made for the signed-in user (JWT id)
  Future<List<QuizSummary>> myAdaptiveQuizzes() async {
    final res = await api.get('/quizzes/mine');
    return asJsonList(res['data']).map((json) => QuizSummary.fromJson(json, isAiGenerated: true)).toList();
  }

  // GET /api/tasks → employees only (individuals get 403). Keeps pending quiz tasks.
  Future<List<AssignedQuiz>> myAssignedQuizzes() async {
    final res = await api.get('/tasks');
    return [
      for (final json in asJsonList(res['data']))
        if (AssignedQuiz.tryFromTaskJson(json) case final assigned?) assigned,
    ];
  }

  // GET /api/quizzes/:id/play → questions and options, never the answers
  Future<QuizPlay> playQuiz(String quizId) async {
    final res = await api.get('/quizzes/${Uri.encodeComponent(quizId)}/play');
    return QuizPlay.fromJson(asJsonMap(res['data']));
  }

  // POST /api/quizzes/:id/submit?review=true → score plus per-question review
  Future<QuizResult> submitQuiz(String quizId, Map<String, QuizOption> answers) async {
    final res = await api.post(
      '/quizzes/${Uri.encodeComponent(quizId)}/submit?review=true',
      {'answers': answersToWire(answers)},
    );
    return QuizResult.fromJson(asJsonMap(res['data']));
  }

  // PUT /api/users/change-password
  Future<void> changePassword(String current, String next) async {
    await api.put('/users/change-password', {'currentPassword': current, 'newPassword': next});
  }

  // PATCH /api/users/me/2fa  — step 1: emails a code
  Future<void> send2FACode() async {
    await api.patch('/users/me/2fa', {'enable': true});
  }

  // step 2: confirm the code
  Future<void> enable2FA(String code) async {
    await api.patch('/users/me/2fa', {'enable': true, 'code': code.trim()});
  }

  Future<void> disable2FA(String password) async {
    await api.patch('/users/me/2fa', {'enable': false, 'password': password});
  }
}
