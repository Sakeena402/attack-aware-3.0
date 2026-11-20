// lib/screens/settings/settings_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../utils/error_message.dart';
import '../../widgets/common_widgets.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Settings state
  bool _notificationsEnabled = true;
  bool _twoFactorEnabled = false;
  bool _saving = false;
  String _selectedTheme = 'dark';

  final _nameCtrl      = TextEditingController();
  final _emailCtrl     = TextEditingController();
  final _phoneCtrl     = TextEditingController();
  final _deptCtrl      = TextEditingController();
  final _currPassCtrl  = TextEditingController();
  final _newPassCtrl   = TextEditingController();

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _nameCtrl.text  = auth.user?.name  ?? '';
    _emailCtrl.text = auth.user?.email ?? '';
    _phoneCtrl.text = auth.user?.phoneNumber ?? '';
    _deptCtrl.text  = auth.user?.department ?? '';
    _twoFactorEnabled = auth.user?.twoFactorEnabled ?? false;
    _loadSettings();

    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameCtrl.dispose(); _emailCtrl.dispose(); _phoneCtrl.dispose();
    _deptCtrl.dispose(); _currPassCtrl.dispose(); _newPassCtrl.dispose();
    super.dispose();
  }

  // The sign-in response has no phone number, so read it from /settings.
  Future<void> _loadSettings() async {
    try {
      final s = await context.read<AuthProvider>().data.settings();
      if (!mounted) return;
      setState(() {
        _nameCtrl.text  = s.name ?? _nameCtrl.text;
        _emailCtrl.text = s.email ?? _emailCtrl.text;
        _phoneCtrl.text = s.phoneNumber ?? '';
        _deptCtrl.text  = s.department ?? '';
      });
    } catch (_) {
      // Not fatal: the form is already filled from the sign-in data, and every
      // tab loads at startup, so a message here would only add noise.
    }
  }

  void _showError(Object err) {
    final message = err is String ? err : describeError(err);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: AppColors.red));
  }

  Future<void> _saveAccount() async {
    if (_nameCtrl.text.trim().isEmpty) {
      _showError('Name is required');
      return;
    }
    final auth = context.read<AuthProvider>();
    setState(() => _saving = true);
    try {
      await auth.data.updateSettings(
        name: _nameCtrl.text,
        phoneNumber: _phoneCtrl.text,
      );
      await auth.refreshUser();
      if (mounted) _showSaveSnack('Account settings saved!');
    } catch (err) {
      if (mounted) _showError(err);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _changePassword() async {
    final cur = _currPassCtrl.text;
    final next = _newPassCtrl.text;
    if (cur.isEmpty || next.isEmpty) {
      _showError('Enter your current and new password');
      return;
    }
    if (next.length < 8) {
      _showError('New password must be at least 8 characters');
      return;
    }
    setState(() => _saving = true);
    try {
      await context.read<AuthProvider>().data.changePassword(cur, next);
      _currPassCtrl.clear();
      _newPassCtrl.clear();
      if (mounted) _showSaveSnack('Password changed!');
    } catch (err) {
      if (mounted) _showError(err);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<String?> _askText(String title, String hint, {bool obscure = false}) {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: Text(title),
        content: TextField(controller: ctrl, obscureText: obscure, autofocus: true, decoration: InputDecoration(hintText: hint)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, ctrl.text), child: const Text('Confirm')),
        ],
      ),
    );
  }

  Future<void> _toggle2FA(bool enable) async {
    final auth = context.read<AuthProvider>();
    try {
      if (enable) {
        await auth.data.send2FACode();
        final code = await _askText('Enter the code we emailed you', '6-digit code');
        if (code == null || code.trim().isEmpty) return;
        await auth.data.enable2FA(code);
      } else {
        final pass = await _askText('Enter your password to turn off 2FA', 'Password', obscure: true);
        if (pass == null || pass.isEmpty) return;
        await auth.data.disable2FA(pass);
      }
      await auth.refreshUser();
      if (!mounted) return;
      setState(() => _twoFactorEnabled = auth.user?.twoFactorEnabled ?? enable);
      _showSaveSnack(enable ? 'Two-factor authentication enabled!' : 'Two-factor authentication disabled.');
    } catch (err) {
      if (mounted) _showError(err);
    }
  }

  void _showSaveSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Row(children: [const Icon(Icons.check_circle, color: AppColors.green), const SizedBox(width: 8), Text(msg)]),
      backgroundColor: AppColors.surface,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      const Tab(icon: Icon(Icons.person_outline, size: 18), text: 'Account'),
      const Tab(icon: Icon(Icons.lock_outline, size: 18), text: 'Security'),
      const Tab(icon: Icon(Icons.notifications_outlined, size: 18), text: 'Alerts'),
    ];

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: SectionHeader(title: 'Settings', subtitle: 'Manage your account and platform preferences'),
          ),
          const SizedBox(height: 16),

          // TabBar
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              tabs: tabs,
              indicator: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(10)),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: Colors.white,
              unselectedLabelColor: AppColors.textMuted,
              labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              padding: const EdgeInsets.all(4),
            ),
          ),
          const SizedBox(height: 16),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _AccountTab(nameCtrl: _nameCtrl, emailCtrl: _emailCtrl, phoneCtrl: _phoneCtrl, deptCtrl: _deptCtrl, theme: _selectedTheme, onThemeChanged: (v) => setState(() => _selectedTheme = v), onSave: _saving ? () {} : _saveAccount),
                _SecurityTab(currPassCtrl: _currPassCtrl, newPassCtrl: _newPassCtrl, twoFactor: _twoFactorEnabled, onToggle2FA: _toggle2FA, onSave: _saving ? () {} : _changePassword),
                _NotificationsTab(enabled: _notificationsEnabled, onToggle: (v) => setState(() => _notificationsEnabled = v), onSave: () => _showSaveSnack('Notification settings saved!')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Account Tab ────────────────────────────────────────────────────────────────
class _AccountTab extends StatelessWidget {
  final TextEditingController nameCtrl, emailCtrl, phoneCtrl, deptCtrl;
  final String theme;
  final ValueChanged<String> onThemeChanged;
  final VoidCallback onSave;

  const _AccountTab({required this.nameCtrl, required this.emailCtrl, required this.phoneCtrl, required this.deptCtrl, required this.theme, required this.onThemeChanged, required this.onSave});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: CyberCard(
        borderColor: AppColors.purple.withValues(alpha: 0.2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Account Settings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            const SizedBox(height: 20),
            CustomTextField(label: 'Full Name', controller: nameCtrl, prefixIcon: Icons.person_outline),
            const SizedBox(height: 12),
            Opacity(opacity: 0.6, child: AbsorbPointer(child: CustomTextField(label: 'Email (cannot be changed here)', controller: emailCtrl, keyboardType: TextInputType.emailAddress, prefixIcon: Icons.email_outlined))),
            const SizedBox(height: 12),
            CustomTextField(label: 'Phone Number', controller: phoneCtrl, keyboardType: TextInputType.phone, prefixIcon: Icons.phone_outlined),
            const SizedBox(height: 12),
            Opacity(opacity: 0.6, child: AbsorbPointer(absorbing: true, child: CustomTextField(label: 'Department (set by your admin)', controller: deptCtrl, prefixIcon: Icons.corporate_fare_outlined))),
            const SizedBox(height: 16),
            const Text('Theme', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: theme,
                  isExpanded: true,
                  dropdownColor: AppColors.card,
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  items: const [
                    DropdownMenuItem(value: 'dark',  child: Text('🌙 Dark')),
                    DropdownMenuItem(value: 'light', child: Text('☀️ Light')),
                  ],
                  onChanged: (v) => onThemeChanged(v ?? 'dark'),
                ),
              ),
            ),
            const SizedBox(height: 24),
            GradientButton(text: 'Save Changes', onPressed: onSave),
          ],
        ),
      ),
    );
  }
}

// ── Security Tab ───────────────────────────────────────────────────────────────
class _SecurityTab extends StatefulWidget {
  final TextEditingController currPassCtrl, newPassCtrl;
  final bool twoFactor;
  final ValueChanged<bool> onToggle2FA;
  final VoidCallback onSave;

  const _SecurityTab({required this.currPassCtrl, required this.newPassCtrl, required this.twoFactor, required this.onToggle2FA, required this.onSave});

  @override
  State<_SecurityTab> createState() => _SecurityTabState();
}

class _SecurityTabState extends State<_SecurityTab> {
  bool _showCurr = false;
  bool _showNew  = false;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: CyberCard(
        borderColor: AppColors.purple.withValues(alpha: 0.2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Security Settings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            const SizedBox(height: 20),

            // 2FA toggle
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: Row(
                children: [
                  Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppColors.purple.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.verified_user_outlined, color: AppColors.purple, size: 20)),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Two-Factor Authentication', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                        Text('Require an emailed code at sign-in', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                  Switch(value: widget.twoFactor, onChanged: widget.onToggle2FA),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Change Password', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
            const SizedBox(height: 12),

            // Current Password
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Current Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: widget.currPassCtrl,
                  obscureText: !_showCurr,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: 'Current Password',
                    prefixIcon: const Icon(Icons.lock_outline, size: 18),
                    suffixIcon: IconButton(icon: Icon(_showCurr ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18), onPressed: () => setState(() => _showCurr = !_showCurr)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // New Password
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('New Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: widget.newPassCtrl,
                  obscureText: !_showNew,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: 'New Password',
                    prefixIcon: const Icon(Icons.lock_outline, size: 18),
                    suffixIcon: IconButton(icon: Icon(_showNew ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18), onPressed: () => setState(() => _showNew = !_showNew)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            GradientButton(text: 'Change Password', onPressed: widget.onSave),
          ],
        ),
      ),
    );
  }
}

// ── Notifications Tab ──────────────────────────────────────────────────────────
class _NotificationsTab extends StatelessWidget {
  final bool enabled;
  final ValueChanged<bool> onToggle;
  final VoidCallback onSave;

  const _NotificationsTab({required this.enabled, required this.onToggle, required this.onSave});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: CyberCard(
        borderColor: AppColors.purple.withValues(alpha: 0.2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Notification Settings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: Row(
                children: [
                  Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppColors.blue.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.notifications_outlined, color: AppColors.blue, size: 20)),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Enable Notifications', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                        Text('Receive campaign alerts and updates', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                  Switch(value: enabled, onChanged: onToggle),
                ],
              ),
            ),
            const SizedBox(height: 24),
            GradientButton(text: 'Save Changes', onPressed: onSave),
          ],
        ),
      ),
    );
  }
}
