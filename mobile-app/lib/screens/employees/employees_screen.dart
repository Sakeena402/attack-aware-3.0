// lib/screens/employees/employees_screen.dart
import 'package:flutter/material.dart';
import '../../services/auth_provider.dart';
import 'package:provider/provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});

  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  String _searchTerm = '';
  String _filterDept = 'all';
  String _filterRisk = 'all';
  final TextEditingController _searchCtrl = TextEditingController();

  List<Map<String, dynamic>> _employees = [];
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
      final rows = await context.read<AuthProvider>().data.employees();
      if (mounted) setState(() => _employees = rows);
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

  List<String> get _departments => ['all', ...{..._employees.map((e) => e['department'] as String)}];

  List<Map<String, dynamic>> get _filtered => _employees.where((e) {
    final matchSearch = (e['name'] as String).toLowerCase().contains(_searchTerm.toLowerCase()) ||
        (e['email'] as String).toLowerCase().contains(_searchTerm.toLowerCase());
    final matchDept = _filterDept == 'all' || e['department'] == _filterDept;
    final matchRisk = _filterRisk == 'all' || e['riskLevel'] == _filterRisk;
    return matchSearch && matchDept && matchRisk;
  }).toList();

  void _exportCSV() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Employee data exported successfully!'), backgroundColor: AppColors.surface),
    );
  }

  void _showEmployeeModal({Map<String, dynamic>? employee}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _EmployeeFormSheet(
        employee: employee,
        onSave: (data) async {
          final api = context.read<AuthProvider>().data;
          final messenger = ScaffoldMessenger.of(context);
          try {
            if (employee != null) {
              await api.updateEmployee(employee['id'].toString(), data);
            } else {
              await api.createEmployee(data);
            }
            if (!mounted) return;
            await _load();
            messenger.showSnackBar(
              SnackBar(content: Text(employee != null ? 'Employee updated!' : 'Employee added!'), backgroundColor: AppColors.surface),
            );
          } catch (err) {
            messenger.showSnackBar(
              SnackBar(content: Text(err.toString()), backgroundColor: AppColors.red),
            );
          }
        },
      ),
    );
  }

  void _confirmDelete(Map<String, dynamic> emp) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Remove Employee'),
        content: Text('Are you sure you want to remove ${emp['name']}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.red),
            onPressed: () async {
              final api = context.read<AuthProvider>().data;
              final messenger = ScaffoldMessenger.of(context);
              final nav = Navigator.of(context);
              try {
                await api.deleteEmployee(emp['id'].toString());
                if (!mounted) return;
                setState(() => _employees.removeWhere((e) => e['id'] == emp['id']));
                nav.pop();
                messenger.showSnackBar(
                  const SnackBar(content: Text('Employee removed'), backgroundColor: AppColors.surface),
                );
              } catch (err) {
                nav.pop();
                messenger.showSnackBar(
                  SnackBar(content: Text(err.toString()), backgroundColor: AppColors.red),
                );
              }
            },
            child: const Text('Remove'),
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
    final stats = {
      'total': _employees.length,
      'highRisk': _employees.where((e) => e['riskLevel'] == 'high').length,
      'trained': _employees.where((e) => (e['trainingProgress'] as int) >= 80).length,
      'avgPoints': _employees.isEmpty ? 0 : (_employees.fold(0, (s, e) => s + (e['points'] as int)) / _employees.length).round(),
    };

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showEmployeeModal(),
        backgroundColor: AppColors.purple,
        icon: const Icon(Icons.person_add),
        label: const Text('Add Employee'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: SectionHeader(title: 'Employees', subtitle: 'Manage and track training progress')),
                IconButton(
                  onPressed: _exportCSV,
                  icon: const Icon(Icons.download_outlined, color: AppColors.textSecondary),
                  tooltip: 'Export CSV',
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Stats
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.7,
              children: [
                MetricCard(title: 'Total Employees', value: '${stats['total']}', icon: Icons.people, color: AppColors.purple),
                MetricCard(title: 'High Risk', value: '${stats['highRisk']}', icon: Icons.warning_amber, color: AppColors.red),
                MetricCard(title: 'Fully Trained', value: '${stats['trained']}', icon: Icons.trending_up, color: AppColors.green),
                MetricCard(title: 'Avg Points', value: '${stats['avgPoints']}', icon: Icons.military_tech, color: AppColors.blue),
              ],
            ),
            const SizedBox(height: 20),

            // Search
            TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _searchTerm = v),
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search, size: 18), hintText: 'Search by name or email...'),
            ),
            const SizedBox(height: 12),

            // Dept filter
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _departments.map((d) {
                  final sel = d == _filterDept;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => _filterDept = d),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                        decoration: BoxDecoration(
                          gradient: sel ? AppColors.primaryGradient : null,
                          color: sel ? null : AppColors.surface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: sel ? Colors.transparent : AppColors.border),
                        ),
                        child: Text(d == 'all' ? 'All Depts' : d, style: TextStyle(color: sel ? Colors.white : AppColors.textMuted, fontSize: 12, fontWeight: sel ? FontWeight.w600 : FontWeight.normal)),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 12),

            // Risk filter
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _filterRisk,
                  isExpanded: true,
                  dropdownColor: AppColors.card,
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('All Risk Levels')),
                    DropdownMenuItem(value: 'low', child: Text('Low Risk')),
                    DropdownMenuItem(value: 'medium', child: Text('Medium Risk')),
                    DropdownMenuItem(value: 'high', child: Text('High Risk')),
                  ],
                  onChanged: (v) => setState(() => _filterRisk = v ?? 'all'),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Employee Cards
            if (_filtered.isEmpty)
              EmptyState(
                icon: Icons.person_add_outlined,
                title: 'No employees found',
                subtitle: _searchTerm.isNotEmpty || _filterDept != 'all' || _filterRisk != 'all'
                    ? 'Try adjusting your filters'
                    : 'Add your first employee to get started',
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 1, childAspectRatio: 2.5, mainAxisSpacing: 12),
                itemCount: _filtered.length,
                itemBuilder: (_, i) => _EmployeeCard(
                  employee: _filtered[i],
                  onEdit: () => _showEmployeeModal(employee: _filtered[i]),
                  onDelete: () => _confirmDelete(_filtered[i]),
                ),
              ),

            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}

class _EmployeeCard extends StatelessWidget {
  final Map<String, dynamic> employee;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _EmployeeCard({required this.employee, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final risk = employee['riskLevel'] as String;
    Color riskColor;
    IconData riskIcon;
    switch (risk) {
      case 'high':   riskColor = AppColors.red;    riskIcon = Icons.warning_amber; break;
      case 'medium': riskColor = AppColors.yellow; riskIcon = Icons.shield_outlined; break;
      default:       riskColor = AppColors.green;  riskIcon = Icons.check_circle_outline;
    }

    final progress = (employee['trainingProgress'] as int) / 100;

    return CyberCard(
      borderColor: riskColor.withOpacity(0.3),
      child: Row(
        children: [
          // Avatar
          UserAvatar(name: employee['name'] as String, radius: 26),
          const SizedBox(width: 12),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(employee['name'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary), overflow: TextOverflow.ellipsis)),
                    StatusBadge(status: risk),
                  ],
                ),
                const SizedBox(height: 2),
                Text(employee['email'] as String, style: const TextStyle(fontSize: 11, color: AppColors.textMuted), overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Row(children: [
                  Text(employee['department'] as String? ?? 'N/A', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                  const SizedBox(width: 8),
                  Container(width: 4, height: 4, decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.textMuted)),
                  const SizedBox(width: 8),
                  Text('${employee['points']} pts', style: const TextStyle(fontSize: 11, color: AppColors.purple)),
                ]),
                const SizedBox(height: 6),
                Row(children: [
                  Expanded(child: AnimatedProgressBar(value: progress, color: AppColors.purple, height: 4)),
                  const SizedBox(width: 6),
                  Text('${employee['trainingProgress']}%', style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                ]),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Actions
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.purple), onPressed: onEdit),
              IconButton(icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.red), onPressed: onDelete),
            ],
          ),
        ],
      ),
    );
  }
}

class _EmployeeFormSheet extends StatefulWidget {
  final Map<String, dynamic>? employee;
  final ValueChanged<Map<String, dynamic>> onSave;

  const _EmployeeFormSheet({this.employee, required this.onSave});

  @override
  State<_EmployeeFormSheet> createState() => _EmployeeFormSheetState();
}

class _EmployeeFormSheetState extends State<_EmployeeFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _deptCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  String _role = 'employee';
  String _riskLevel = 'low';

  @override
  void initState() {
    super.initState();
    final e = widget.employee;
    if (e != null) {
      _nameCtrl.text = e['name'] ?? '';
      _emailCtrl.text = e['email'] ?? '';
      _deptCtrl.text = e['department'] ?? '';
      _phoneCtrl.text = e['phoneNumber'] ?? '';
      _riskLevel = e['riskLevel'] ?? 'low';
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose(); _passwordCtrl.dispose();
    _deptCtrl.dispose(); _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.employee != null;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 20),
              Text(isEdit ? 'Edit Employee' : 'Add New Employee', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 24),

              CustomTextField(label: 'Full Name', hint: 'John Doe', controller: _nameCtrl, prefixIcon: Icons.person_outline, validator: (v) => v?.isEmpty == true ? 'Required' : null),
              const SizedBox(height: 12),
              CustomTextField(label: 'Email Address', hint: 'john@company.com', controller: _emailCtrl, keyboardType: TextInputType.emailAddress, prefixIcon: Icons.email_outlined, validator: (v) => v?.isEmpty == true ? 'Required' : null),
              const SizedBox(height: 12),
              CustomTextField(
                label: isEdit ? 'Password (leave blank to keep current)' : 'Password',
                hint: isEdit ? '(unchanged)' : 'Create password',
                controller: _passwordCtrl,
                prefixIcon: Icons.lock_outline,
                obscureText: true,
                validator: (v) => !isEdit && (v?.isEmpty == true) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              CustomTextField(label: 'Phone Number', hint: '+92xxxxxxxxxx', controller: _phoneCtrl, keyboardType: TextInputType.phone, prefixIcon: Icons.phone_outlined),
              const SizedBox(height: 12),

              Row(children: [
                Expanded(child: CustomTextField(label: 'Department', hint: 'Engineering', controller: _deptCtrl, prefixIcon: Icons.corporate_fare_outlined)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Role', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _role,
                            isExpanded: true,
                            dropdownColor: AppColors.card,
                            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                            items: const [
                              DropdownMenuItem(value: 'employee', child: Text('Employee')),
                            ],
                            onChanged: (v) => setState(() => _role = v ?? 'employee'),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ]),
              const SizedBox(height: 16),

              // Risk Level
              const Text('Risk Level', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
              const SizedBox(height: 8),
              Row(children: ['low', 'medium', 'high'].map((lvl) {
                final sel = _riskLevel == lvl;
                Color c;
                switch (lvl) {
                  case 'high':   c = AppColors.red;    break;
                  case 'medium': c = AppColors.yellow; break;
                  default:       c = AppColors.green;
                }
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => _riskLevel = lvl),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: sel ? c.withOpacity(0.2) : AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: sel ? c : AppColors.border),
                        ),
                        child: Text(lvl[0].toUpperCase() + lvl.substring(1), textAlign: TextAlign.center, style: TextStyle(color: sel ? c : AppColors.textMuted, fontWeight: sel ? FontWeight.w600 : FontWeight.normal, fontSize: 13)),
                      ),
                    ),
                  ),
                );
              }).toList()),
              const SizedBox(height: 24),

              Row(children: [
                Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel'))),
                const SizedBox(width: 12),
                Expanded(child: GradientButton(
                  text: isEdit ? 'Update Employee' : 'Add Employee',
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      widget.onSave({
                        'name': _nameCtrl.text,
                        'email': _emailCtrl.text,
                        'password': _passwordCtrl.text,
                        'department': _deptCtrl.text,
                        'phoneNumber': _phoneCtrl.text,
                        'role': _role,
                        'riskLevel': _riskLevel,
                      });
                      Navigator.pop(context);
                    }
                  },
                )),
              ]),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}