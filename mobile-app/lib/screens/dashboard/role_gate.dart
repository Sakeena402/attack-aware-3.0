// lib/screens/dashboard/role_gate.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user_model.dart';
import '../../services/auth_provider.dart';
import '../role/role_error_screen.dart';
import '../role/web_only_screen.dart';
import 'dashboard_layout.dart';

/// Decides what a signed-in user sees, based on the role from the backend.
///   employee / individual  -> learner app
///   admin / super_admin    -> "use the web dashboard" screen
///   missing / unknown role -> error screen (never treated as employee)
/// Also sends the user back to login whenever the session ends (logout or an
/// expired refresh token).
class RoleGate extends StatefulWidget {
  const RoleGate({super.key});

  @override
  State<RoleGate> createState() => _RoleGateState();
}

class _RoleGateState extends State<RoleGate> {
  bool _redirecting = false;

  void _redirectToLogin() {
    if (_redirecting) return;
    _redirecting = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    if (!auth.isAuthenticated || user == null) {
      _redirectToLogin();
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final role = user.role;
    if (role == null) {
      return RoleErrorScreen(rawRole: user.rawRole);
    }

    switch (role) {
      case UserRole.admin:
      case UserRole.superAdmin:
        return const WebOnlyScreen();
      case UserRole.employee:
      case UserRole.individual:
        return DashboardLayout(key: ValueKey(role), role: role);
    }
  }
}
