// lib/screens/role/role_error_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';

/// Shown when the backend sends a missing or unknown role. The app does not
/// guess a role; the user can retry (re-reads /auth/me) or log out.
class RoleErrorScreen extends StatefulWidget {
  final String? rawRole;
  const RoleErrorScreen({super.key, required this.rawRole});

  @override
  State<RoleErrorScreen> createState() => _RoleErrorScreenState();
}

class _RoleErrorScreenState extends State<RoleErrorScreen> {
  bool _busy = false;

  Future<void> _retry() async {
    setState(() => _busy = true);
    await context.read<AuthProvider>().refreshUser();
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final raw = widget.rawRole;
    final detail = (raw == null || raw.isEmpty)
        ? 'Your account has no role assigned.'
        : 'Your account role "$raw" is not supported by this app.';

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 56, color: AppColors.yellow),
                  const SizedBox(height: 20),
                  const Text(
                    'We could not verify your account type',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '$detail Please try again or contact your administrator.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 14, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 28),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      FilledButton(
                        onPressed: _busy ? null : _retry,
                        child: _busy
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Text('Retry'),
                      ),
                      const SizedBox(width: 12),
                      OutlinedButton(
                        onPressed: _busy ? null : () => context.read<AuthProvider>().logout(),
                        child: const Text('Log out', style: TextStyle(color: AppColors.red)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
