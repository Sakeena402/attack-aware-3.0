// lib/screens/role/web_only_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';

/// Shown to admin and super-admin accounts. Their tools live on the web.
class WebOnlyScreen extends StatelessWidget {
  const WebOnlyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

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
                  const Icon(Icons.desktop_windows_outlined, size: 56, color: AppColors.purpleLight),
                  const SizedBox(height: 20),
                  const Text(
                    'Please use the web dashboard',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Admin and super admin accounts are managed on the web dashboard. '
                    'This app is for employees and individual learners.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: AppColors.textMuted),
                  ),
                  if (user != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      'Signed in as ${user.email}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                  ],
                  const SizedBox(height: 28),
                  OutlinedButton.icon(
                    onPressed: () => context.read<AuthProvider>().logout(),
                    icon: const Icon(Icons.logout, color: AppColors.red),
                    label: const Text('Log out', style: TextStyle(color: AppColors.red)),
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
