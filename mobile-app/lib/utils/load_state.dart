// lib/utils/load_state.dart
import 'package:flutter/foundation.dart';
import 'error_message.dart';

/// What a screen that loads data is currently showing.
sealed class LoadState<T> {
  const LoadState();
}

final class LoadInProgress<T> extends LoadState<T> {
  const LoadInProgress();
}

final class LoadSuccess<T> extends LoadState<T> {
  const LoadSuccess(this.data);
  final T data;
}

final class LoadFailure<T> extends LoadState<T> {
  const LoadFailure(this.message);
  final String message;
}

/// Runs one fetch function and exposes loading / success / failure.
///  - [load]: first load or "Retry". Shows the spinner.
///  - [refresh]: pull-to-refresh. Keeps the data on screen; if it fails the
///    old data stays and the message is available once via [takeRefreshError].
/// A response that arrives after a newer request started is ignored.
class LoadController<T> extends ChangeNotifier {
  LoadController(this._fetch);

  final Future<T> Function() _fetch;

  LoadState<T> _state = const LoadInProgress();
  String? _refreshError;
  int _generation = 0;
  bool _disposed = false;

  LoadState<T> get state => _state;

  Future<void> load() async {
    _update(const LoadInProgress());
    await _run(keepDataOnError: false);
  }

  Future<void> refresh() => _run(keepDataOnError: true);

  String? takeRefreshError() {
    final error = _refreshError;
    _refreshError = null;
    return error;
  }

  Future<void> _run({required bool keepDataOnError}) async {
    final generation = ++_generation;
    try {
      final data = await _fetch();
      if (generation != _generation) return;
      _update(LoadSuccess<T>(data));
    } catch (error) {
      if (generation != _generation) return;
      final message = describeError(error);
      if (keepDataOnError && _state is LoadSuccess<T>) {
        _refreshError = message;
      } else {
        _update(LoadFailure<T>(message));
      }
    }
  }

  void _update(LoadState<T> next) {
    if (_disposed) return;
    _state = next;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
