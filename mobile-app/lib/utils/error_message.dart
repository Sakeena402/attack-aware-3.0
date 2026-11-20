// lib/utils/error_message.dart
import '../services/api_client.dart';

/// One place that turns any thrown object into text that is safe to show.
/// [ApiException] messages are already user-facing (see ApiClient); anything
/// else (parse errors, bugs) gets a generic message instead of a stack-trace
/// style string.
String describeError(Object error) {
  if (error is ApiException) return error.message;
  return 'Something went wrong. Please try again.';
}
