// lib/screens/dashboard/dashboard_layout.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';
import '../admin/admin_dashboard_screen.dart';
import '../employee/employee_dashboard_screen.dart';
import '../admin/super_admin_dashboard_screen.dart';
import '../campaigns/campaigns_screen.dart';
import '../employees/employees_screen.dart';
import '../leaderboard/leaderboard_screen.dart';
import '../analytics/analytics_screen.dart';
import '../companies/companies_screen.dart';
import '../settings/settings_screen.dart';
import '../employees/employees_screen.dart';

class DashboardLayout extends StatefulWidget {
  const DashboardLayout({super.key});

  @override
  State<DashboardLayout> createState() => _DashboardLayoutState();
}

class _DashboardLayoutState extends State<DashboardLayout> {
  int _selectedIndex = 0;

  List<_NavItem> _getNavItems(String role) {
    final common = [
      _NavItem(icon: Icons.dashboard_outlined, label: 'Dashboard', selectedIcon: Icons.dashboard),
      _NavItem(icon: Icons.leaderboard_outlined, label: 'Leaderboard', selectedIcon: Icons.leaderboard),
      _NavItem(icon: Icons.settings_outlined, label: 'Settings', selectedIcon: Icons.settings),
    ];

    if (role == 'super_admin') {
      return [
        _NavItem(icon: Icons.dashboard_outlined, label: 'Dashboard', selectedIcon: Icons.dashboard),
        _NavItem(icon: Icons.business_outlined, label: 'Companies', selectedIcon: Icons.business),
        _NavItem(icon: Icons.leaderboard_outlined, label: 'Leaderboard', selectedIcon: Icons.leaderboard),
        _NavItem(icon: Icons.settings_outlined, label: 'Settings', selectedIcon: Icons.settings),
      ];
    }

    if (role == 'admin') {
      return [
        _NavItem(icon: Icons.dashboard_outlined, label: 'Dashboard', selectedIcon: Icons.dashboard),
        _NavItem(icon: Icons.campaign_outlined, label: 'Campaigns', selectedIcon: Icons.campaign),
        _NavItem(icon: Icons.people_outlined, label: 'Employees', selectedIcon: Icons.people),
        _NavItem(icon: Icons.bar_chart_outlined, label: 'Analytics', selectedIcon: Icons.bar_chart),
        _NavItem(icon: Icons.leaderboard_outlined, label: 'Leaderboard', selectedIcon: Icons.leaderboard),
        _NavItem(icon: Icons.settings_outlined, label: 'Settings', selectedIcon: Icons.settings),
      ];
    }

    return common;
  }

  Widget _getScreen(String role, int index) {
    if (role == 'super_admin') {
      switch (index) {
        case 0: return const SuperAdminDashboardScreen();
        case 1: return const CompaniesScreen();
        case 2: return const LeaderboardScreen();
        case 3: return const SettingsScreen();
        default: return const SuperAdminDashboardScreen();
      }
    }

    if (role == 'admin') {
      switch (index) {
        case 0: return const AdminDashboardScreen();
        case 1: return const CampaignsScreen();
        case 2: return const EmployeesScreen();
        case 3: return const AnalyticsScreen();
        case 4: return const LeaderboardScreen();
        case 5: return const SettingsScreen();
        default: return const AdminDashboardScreen();
      }
    }

    // employee
    switch (index) {
      case 0: return const EmployeeDashboardScreen();
      case 1: return const LeaderboardScreen();
      case 2: return const SettingsScreen();
      default: return const EmployeeDashboardScreen();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final role = auth.user?.role ?? 'employee';
    final navItems = _getNavItems(role);

    return Scaffold(
      backgroundColor: AppColors.background,
      drawer: _buildDrawer(context, auth, navItems),
      appBar: _buildAppBar(context, navItems),
      body: Stack(
        children: [
          // Background glow
          Positioned(top: -100, right: -100, child: _glowCircle(AppColors.purple.withOpacity(0.06), 300)),
          Positioned(bottom: -100, left: -100, child: _glowCircle(AppColors.blue.withOpacity(0.05), 300)),
          // Content
          IndexedStack(
            index: _selectedIndex,
            children: List.generate(navItems.length, (i) => _getScreen(role, i)),
          ),
        ],
      ),
      bottomNavigationBar: navItems.length <= 4 ? _buildBottomNav(navItems) : null,
    );
  }

  Widget _glowCircle(Color color, double size) {
    return Container(width: size, height: size, decoration: BoxDecoration(shape: BoxShape.circle, color: color));
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, List<_NavItem> navItems) {
    final auth = context.read<AuthProvider>();
    final title = navItems.isNotEmpty && _selectedIndex < navItems.length
        ? navItems[_selectedIndex].label
        : 'Dashboard';

    return AppBar(
      backgroundColor: AppColors.surface,
      elevation: 0,
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(height: 1, color: AppColors.border),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(8)),
            child: const Icon(Icons.security, color: Colors.white, size: 16),
          ),
          const SizedBox(width: 10),
          Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        ],
      ),
      actions: [
        // Notification bell
        IconButton(
          icon: Stack(
            children: [
              const Icon(Icons.notifications_outlined, color: AppColors.textSecondary),
              Positioned(
                right: 0, top: 0,
                child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.red, shape: BoxShape.circle)),
              ),
            ],
          ),
          onPressed: () {},
        ),
        // User avatar with menu
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: GestureDetector(
            onTap: () => _showUserMenu(context, auth),
            child: UserAvatar(name: auth.user?.name ?? '?', radius: 17),
          ),
        ),
      ],
    );
  }

  void _showUserMenu(BuildContext context, AuthProvider auth) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 36, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 20),
              UserAvatar(name: auth.user?.name ?? '?', radius: 28),
              const SizedBox(height: 12),
              Text(auth.user?.name ?? '', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              Text(auth.user?.email ?? '', style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
              const SizedBox(height: 8),
              StatusBadge(status: auth.user?.role ?? 'employee'),
              const SizedBox(height: 24),
              const Divider(color: AppColors.border),
              ListTile(
                leading: const Icon(Icons.logout, color: AppColors.red),
                title: const Text('Logout', style: TextStyle(color: AppColors.red)),
                onTap: () async {
                  Navigator.pop(context);
                  await auth.logout();
                  if (mounted) Navigator.of(context).pushReplacementNamed('/login');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, AuthProvider auth, List<_NavItem> navItems) {
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            // Drawer header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1A1D2E), Color(0xFF0F1117)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.security, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Attack Aware', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      Text('3.0 Enterprise', style: TextStyle(fontSize: 11, color: AppColors.purpleLight)),
                    ],
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: AppColors.border),

            // User info
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  UserAvatar(name: auth.user?.name ?? '?', radius: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(auth.user?.name ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary), overflow: TextOverflow.ellipsis),
                        Text(auth.user?.role ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(color: AppColors.border),

            // Nav items
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: navItems.length,
                separatorBuilder: (_, __) => const SizedBox(height: 2),
                itemBuilder: (_, i) => DrawerNavTile(
                  icon: _selectedIndex == i ? navItems[i].selectedIcon : navItems[i].icon,
                  label: navItems[i].label,
                  isSelected: _selectedIndex == i,
                  onTap: () {
                    setState(() => _selectedIndex = i);
                    Navigator.pop(context);
                  },
                ),
              ),
            ),

            // Logout
            const Divider(color: AppColors.border),
            Padding(
              padding: const EdgeInsets.all(16),
              child: ListTile(
                leading: const Icon(Icons.logout, color: AppColors.red),
                title: const Text('Logout', style: TextStyle(color: AppColors.red, fontWeight: FontWeight.w500)),
                onTap: () async {
                  Navigator.pop(context);
                  await auth.logout();
                  if (mounted) Navigator.of(context).pushReplacementNamed('/login');
                },
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                tileColor: AppColors.red.withOpacity(0.08),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNav(List<_NavItem> navItems) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (i) => setState(() => _selectedIndex = i),
        items: navItems.map((item) => BottomNavigationBarItem(
          icon: Icon(item.icon),
          activeIcon: Icon(item.selectedIcon),
          label: item.label,
        )).toList(),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  _NavItem({required this.icon, required this.label, required this.selectedIcon});
}