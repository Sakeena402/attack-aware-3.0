// lib/screens/companies/companies_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';

class CompaniesScreen extends StatefulWidget {
  const CompaniesScreen({super.key});

  @override
  State<CompaniesScreen> createState() => _CompaniesScreenState();
}

class _CompaniesScreenState extends State<CompaniesScreen> {
  String _searchTerm = '';
  final TextEditingController _searchCtrl = TextEditingController();

  List<Map<String, dynamic>> _companies = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await context.read<AuthProvider>().data.companies();
      if (mounted) setState(() => _companies = rows);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filtered => _companies
      .where((c) => c['companyName'].toString().toLowerCase().contains(_searchTerm.toLowerCase()) || c['industry'].toString().toLowerCase().contains(_searchTerm.toLowerCase()))
      .toList();

  Set<String> get _industries => _companies.map((c) => c['industry'] as String).toSet();

  void _confirmDelete(Map<String, dynamic> company) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Company?'),
        content: Text('Are you sure you want to delete "${company['companyName']}"? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.red),
            onPressed: () async {
              final messenger = ScaffoldMessenger.of(context);
              Navigator.pop(context);
              try {
                await this.context.read<AuthProvider>().data.deleteCompany(company['id'].toString());
                if (!mounted) return;
                await _load();
                messenger.showSnackBar(const SnackBar(content: Text('Company deleted successfully'), backgroundColor: AppColors.surface));
              } catch (err) {
                messenger.showSnackBar(SnackBar(content: Text(err.toString()), backgroundColor: AppColors.red));
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showCompanyDialog({Map<String, dynamic>? company}) {
    final nameCtrl = TextEditingController(text: company == null ? '' : '${company['companyName']}');
    final industryCtrl = TextEditingController(text: company == null ? '' : '${company['industry']}');
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(company == null ? 'Add Company' : 'Edit Company'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Company Name', hintText: 'e.g. Acme Corp')),
            const SizedBox(height: 12),
            TextField(controller: industryCtrl, decoration: const InputDecoration(labelText: 'Industry', hintText: 'e.g. Technology')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final name = nameCtrl.text.trim();
              final industry = industryCtrl.text.trim();
              if (name.isEmpty || industry.isEmpty) return;
              final messenger = ScaffoldMessenger.of(context);
              final data = context.read<AuthProvider>().data;
              Navigator.pop(dialogContext);
              try {
                if (company == null) {
                  await data.createCompany(name, industry);
                } else {
                  await data.updateCompany(company['id'].toString(), name, industry);
                }
                if (!mounted) return;
                await _load();
                messenger.showSnackBar(SnackBar(content: Text(company == null ? 'Company added!' : 'Company updated!'), backgroundColor: AppColors.surface));
              } catch (err) {
                messenger.showSnackBar(SnackBar(content: Text(err.toString()), backgroundColor: AppColors.red));
              }
            },
            child: Text(company == null ? 'Add' : 'Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, style: const TextStyle(color: AppColors.red)),
            TextButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );
    }
    final auth = context.watch<AuthProvider>();
    if (auth.user?.role != 'super_admin') {
      return const Center(child: Text('Access Denied: Super Admin role required', style: TextStyle(color: AppColors.red)));
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCompanyDialog(),
        backgroundColor: AppColors.purple,
        icon: const Icon(Icons.add),
        label: const Text('Add Company'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: 'Companies Management', subtitle: 'Manage all companies on the platform'),
            const SizedBox(height: 20),

            // Stats
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.2,
              children: [
                _StatTile(icon: Icons.business, label: 'Total', value: '${_companies.length}', color: AppColors.purple),
                _StatTile(icon: Icons.public, label: 'Industries', value: '${_industries.length}', color: AppColors.blue),
                _StatTile(icon: Icons.verified_outlined, label: 'Active', value: '${_companies.length}', color: AppColors.green),
              ],
            ),
            const SizedBox(height: 16),

            // Search
            TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _searchTerm = v),
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search, size: 18), hintText: 'Search companies...'),
            ),
            const SizedBox(height: 16),

            if (_filtered.isEmpty)
              const EmptyState(icon: Icons.business_outlined, title: 'No companies found', subtitle: 'Try adjusting your search or add a new company')
            else
              ..._filtered.map((c) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: CyberCard(
                  borderColor: AppColors.purple.withOpacity(0.2),
                  child: Row(
                    children: [
                      Container(
                        width: 46, height: 46,
                        decoration: BoxDecoration(color: AppColors.purple.withOpacity(0.2), borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.business, color: AppColors.purple, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(c['companyName'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                            Text(c['industry'] as String, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                            Text('Created: ${c['createdAt']}', style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                          ],
                        ),
                      ),
                      const StatusBadge(status: 'active'),
                      const SizedBox(width: 4),
                      IconButton(icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.blue), onPressed: () => _showCompanyDialog(company: c)),
                      IconButton(icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.red), onPressed: () => _confirmDelete(c)),
                    ],
                  ),
                ),
              )),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatTile({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return CyberCard(
      borderColor: color.withOpacity(0.3),
      gradient: LinearGradient(colors: [color.withOpacity(0.1), Colors.transparent]),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ],
      ),
    );
  }
}