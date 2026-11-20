// lib/widgets/async_body.dart
import 'package:flutter/material.dart';
import '../utils/app_theme.dart';
import '../utils/load_state.dart';

/// Shared loading / error + Retry / empty / pull-to-refresh behaviour.
/// [builder] must return a scrollable that uses AlwaysScrollableScrollPhysics
/// so pull-to-refresh works.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({
    super.key,
    required this.controller,
    required this.builder,
    this.isEmpty,
    this.emptyTitle = 'Nothing here yet',
    this.emptyMessage,
    this.emptyIcon = Icons.inbox_outlined,
  });

  final LoadController<T> controller;
  final Widget Function(BuildContext context, T data) builder;
  final bool Function(T data)? isEmpty;
  final String emptyTitle;
  final String? emptyMessage;
  final IconData emptyIcon;

  Future<void> _refresh(BuildContext context) async {
    await controller.refresh();
    final error = controller.takeRefreshError();
    if (error != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Couldn't refresh: $error"), backgroundColor: AppColors.red),
      );
    }
  }

  Widget _refreshable(BuildContext context, Widget child) {
    return RefreshIndicator(
      onRefresh: () => _refresh(context),
      child: LayoutBuilder(
        builder: (context, constraints) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [SizedBox(height: constraints.maxHeight, child: child)],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final state = controller.state;
        switch (state) {
          case LoadInProgress<T>():
            return const Center(child: CircularProgressIndicator());
          case LoadFailure<T>(:final message):
            return _refreshable(
              context,
              _MessageView(
                icon: Icons.cloud_off_outlined,
                title: message,
                actionLabel: 'Retry',
                onAction: controller.load,
              ),
            );
          case LoadSuccess<T>(:final data):
            if (isEmpty?.call(data) ?? false) {
              return _refreshable(
                context,
                _MessageView(icon: emptyIcon, title: emptyTitle, message: emptyMessage),
              );
            }
            return RefreshIndicator(
              onRefresh: () => _refresh(context),
              child: builder(context, data),
            );
        }
      },
    );
  }
}

class _MessageView extends StatelessWidget {
  const _MessageView({
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44, color: AppColors.textMuted),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
            if (message != null) ...[
              const SizedBox(height: 6),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 16),
              OutlinedButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}
