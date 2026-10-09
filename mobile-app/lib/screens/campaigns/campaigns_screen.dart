// lib/screens/campaigns/campaigns_screen.dart
import 'package:flutter/material.dart';
import '../../services/auth_provider.dart';
import 'package:provider/provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';

class CampaignsScreen extends StatefulWidget {
  const CampaignsScreen({super.key});

  @override
  State<CampaignsScreen> createState() => _CampaignsScreenState();
}

class _CampaignsScreenState extends State<CampaignsScreen> {
  String _searchTerm = '';
  String _filterType = 'all';
  String _filterStatus = 'all';
  final TextEditingController _searchCtrl = TextEditingController();

  List<Map<String, dynamic>> _campaigns = [];
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
      final rows = await context.read<AuthProvider>().data.campaigns();
      if (mounted) setState(() => _campaigns = rows);
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

  List<Map<String, dynamic>> get _filtered => _campaigns.where((c) {
    final matchSearch = c['name'].toString().toLowerCase().contains(_searchTerm.toLowerCase());
    final matchType = _filterType == 'all' || c['type'] == _filterType;
    final matchStatus = _filterStatus == 'all' || c['status'] == _filterStatus;
    return matchSearch && matchType && matchStatus;
  }).toList();

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
      'total': _campaigns.length,
      'active': _campaigns.where((c) => c['status'] == 'active').length,
      'avgClick': _campaigns.isEmpty ? 0.0 : _campaigns.fold(0.0, (s, c) => s + (c['clickRate'] as num)) / _campaigns.length,
      'avgReport': _campaigns.isEmpty ? 0.0 : _campaigns.fold(0.0, (s, c) => s + (c['reportRate'] as num)) / _campaigns.length,
    };

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCampaignModal(context),
        backgroundColor: AppColors.purple,
        icon: const Icon(Icons.add),
        label: const Text('New Campaign'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: 'Campaigns', subtitle: 'Manage your security awareness campaigns'),
            const SizedBox(height: 20),

            // Stats
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.4,
              children: [
                MetricCard(title: 'Total Campaigns', value: '${stats['total']}', icon: Icons.bolt, color: AppColors.purple),
                MetricCard(title: 'Active', value: '${stats['active']}', icon: Icons.play_circle_outline, color: AppColors.green),
                MetricCard(title: 'Avg Click Rate', value: '${(stats['avgClick'] as double).toStringAsFixed(1)}%', icon: Icons.gps_fixed, color: AppColors.red),
                MetricCard(title: 'Avg Report Rate', value: '${(stats['avgReport'] as double).toStringAsFixed(1)}%', icon: Icons.trending_up, color: AppColors.blue),
              ],
            ),
            const SizedBox(height: 20),

            // Search
            TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _searchTerm = v),
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search, size: 18), hintText: 'Search campaigns...'),
            ),
            const SizedBox(height: 12),

            // Type filter
            FilterChipRow(
              options: const ['all', 'phishing', 'smishing', 'vishing'],
              selected: _filterType,
              onSelected: (v) => setState(() => _filterType = v),
            ),
            const SizedBox(height: 12),

            // Status dropdown
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _filterStatus,
                  isExpanded: true,
                  dropdownColor: AppColors.card,
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  items: ['all', 'draft', 'active', 'paused', 'completed'].map((s) => DropdownMenuItem(
                    value: s,
                    child: Text(s == 'all' ? 'All Status' : s[0].toUpperCase() + s.substring(1)),
                  )).toList(),
                  onChanged: (v) => setState(() => _filterStatus = v ?? 'all'),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Campaign list
            if (_filtered.isEmpty)
              EmptyState(
                icon: Icons.bolt,
                title: 'No campaigns found',
                subtitle: _searchTerm.isNotEmpty || _filterType != 'all' || _filterStatus != 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first campaign to get started',
                action: _searchTerm.isEmpty ? GradientButton(text: 'Create Campaign', icon: Icons.add, onPressed: () => _showCampaignModal(context)) : null,
              )
            else
              ..._filtered.map((c) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _CampaignCard(campaign: c, onEdit: () => _showCampaignModal(context, campaign: c), onDelete: () => _confirmDelete(context, c), onStatusChange: (s) => _changeStatus(c, s)),
              )),
          ],
        ),
      ),
    );
  }

  Future<void> _changeStatus(Map<String, dynamic> campaign, String newStatus) async {
    final api = context.read<AuthProvider>().data;
    final messenger = ScaffoldMessenger.of(context);
    final id = campaign['id'].toString();

    if (newStatus == 'active') {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Launch campaign?'),
          content: Text(
            '"${campaign['name']}" will send real messages to its ${campaign['targets']} target(s) right now, exactly like launching it on the website.',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Launch')),
          ],
        ),
      );
      if (ok != true) return;
    }

    try {
      if (newStatus == 'active') {
        await api.launchCampaign(id);
      } else {
        await api.pauseCampaign(id);
      }
      if (!mounted) return;
      await _load();
      messenger.showSnackBar(SnackBar(
        content: Text('Campaign ${newStatus == 'active' ? 'launched' : 'paused'}'),
        backgroundColor: AppColors.surface,
      ));
    } catch (err) {
      messenger.showSnackBar(SnackBar(
        content: Text(err.toString()),
        backgroundColor: AppColors.red,
      ));
    }
  }

  void _confirmDelete(BuildContext context, Map<String, dynamic> campaign) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Campaign'),
        content: Text('Are you sure you want to delete "${campaign['name']}"? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.red),
            onPressed: () async {
              final api = context.read<AuthProvider>().data;
              final messenger = ScaffoldMessenger.of(context);
              final nav = Navigator.of(context);
              try {
                await api.deleteCampaign(campaign['id'].toString());
                if (!mounted) return;
                setState(() => _campaigns.removeWhere((c) => c['id'] == campaign['id']));
                nav.pop();
                messenger.showSnackBar(const SnackBar(content: Text('Campaign deleted'), backgroundColor: AppColors.surface));
              } catch (err) {
                nav.pop();
                messenger.showSnackBar(SnackBar(content: Text(err.toString()), backgroundColor: AppColors.red));
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Future<void> _showCampaignModal(BuildContext context, {Map<String, dynamic>? campaign}) async {
    final messenger = ScaffoldMessenger.of(context);
    final auth = context.read<AuthProvider>();

    // The form needs your company's employees so you can pick the targets.
    List<Map<String, dynamic>> employees;
    try {
      employees = await auth.data.employees();
    } catch (err) {
      messenger.showSnackBar(SnackBar(content: Text(err.toString()), backgroundColor: AppColors.red));
      return;
    }
    if (!mounted) return;

    showModalBottomSheet(
      context: this.context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _CampaignFormSheet(
        campaign: campaign,
        employees: employees,
        onSave: (data) async {
          try {
            if (campaign != null) {
              await auth.data.updateCampaign(campaign['id'].toString(), data);
            } else {
              await auth.data.createCampaign(data);
            }
            if (!mounted) return;
            await _load();
            messenger.showSnackBar(SnackBar(
              content: Text(campaign != null ? 'Campaign updated!' : 'Campaign created as a draft!'),
              backgroundColor: AppColors.surface,
            ));
          } catch (err) {
            messenger.showSnackBar(SnackBar(content: Text(err.toString()), backgroundColor: AppColors.red));
          }
        },
      ),
    );
  }
}

class _CampaignCard extends StatelessWidget {
  final Map<String, dynamic> campaign;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final ValueChanged<String> onStatusChange;

  const _CampaignCard({required this.campaign, required this.onEdit, required this.onDelete, required this.onStatusChange});

  @override
  Widget build(BuildContext context) {
    final type = campaign['type'] as String;
    final status = campaign['status'] as String;

    Color typeColor;
    IconData typeIcon;
    switch (type) {
      case 'smishing': typeColor = AppColors.yellow; typeIcon = Icons.sms_outlined; break;
      case 'vishing': typeColor = AppColors.blue; typeIcon = Icons.phone_outlined; break;
      default: typeColor = AppColors.red; typeIcon = Icons.email_outlined;
    }

    return CyberCard(
      borderColor: typeColor.withOpacity(0.25),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: typeColor.withOpacity(0.15), borderRadius: BorderRadius.circular(8)), child: Icon(typeIcon, color: typeColor, size: 18)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(campaign['name'], style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    Text('${campaign['startDate'] ?? 'No date'}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  ],
                ),
              ),
              StatusBadge(status: status),
            ],
          ),
          const SizedBox(height: 12),

          // Stats row
          Row(
            children: [
              _statChip(Icons.people, '${campaign['targets']} targets', AppColors.textMuted),
              const SizedBox(width: 10),
              _statChip(Icons.gps_fixed, '${(campaign['clickRate'] as num).toStringAsFixed(1)}% click', AppColors.orange),
              const SizedBox(width: 10),
              _statChip(Icons.shield, '${(campaign['reportRate'] as num).toStringAsFixed(1)}% report', AppColors.green),
            ],
          ),
          const SizedBox(height: 12),

          // Progress bars
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Click Rate', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
              const SizedBox(height: 4),
              AnimatedProgressBar(value: (campaign['clickRate'] as num) / 100, color: AppColors.orange),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Report Rate', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
              const SizedBox(height: 4),
              AnimatedProgressBar(value: (campaign['reportRate'] as num) / 100, color: AppColors.green),
            ])),
          ]),
          const SizedBox(height: 12),

          // Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (status == 'active')
                _actionBtn(Icons.pause_circle_outline, AppColors.yellow, 'Pause', () => onStatusChange('paused'))
              else if (status == 'draft' || status == 'paused')
                _actionBtn(Icons.play_circle_outline, AppColors.green, 'Launch', () => onStatusChange('active')),
              _actionBtn(Icons.edit_outlined, AppColors.purple, 'Edit', onEdit),
              _actionBtn(Icons.delete_outline, AppColors.red, 'Delete', onDelete),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statChip(IconData icon, String label, Color color) => Row(children: [
    Icon(icon, size: 12, color: color),
    const SizedBox(width: 4),
    Text(label, style: TextStyle(fontSize: 11, color: color)),
  ]);

  Widget _actionBtn(IconData icon, Color color, String tooltip, VoidCallback onTap) => Tooltip(
    message: tooltip,
    child: IconButton(icon: Icon(icon, color: color, size: 20), onPressed: onTap, splashRadius: 20),
  );
}

const Map<String, List<Map<String, String>>> _kTemplates = {
  'phishing': [
    {'key': 'bank_phishing', 'name': 'Bank Login Verification'},
    {'key': 'office365_phishing', 'name': 'Office 365 Verification'},
    {'key': 'hr_phishing', 'name': 'HR Benefits Update'},
  ],
  'smishing': [
    {'key': 'bank_alert', 'name': 'Bank Security Alert'},
    {'key': 'package_delivery', 'name': 'Package Delivery'},
    {'key': 'hr_benefits', 'name': 'HR Benefits Update'},
    {'key': 'password_reset', 'name': 'Password Reset'},
    {'key': 'prize_winner', 'name': 'Prize Winner'},
    {'key': 'tax_refund', 'name': 'Tax Refund'},
  ],
  'vishing': [
    {'key': 'bank_verification', 'name': 'Bank Verification'},
    {'key': 'it_support', 'name': 'IT Support Call'},
    {'key': 'insurance_claim', 'name': 'Insurance Claim'},
  ],
};

class _CampaignFormSheet extends StatefulWidget {
  final Map<String, dynamic>? campaign;
  final List<Map<String, dynamic>> employees;
  final ValueChanged<Map<String, dynamic>> onSave;

  const _CampaignFormSheet({this.campaign, required this.employees, required this.onSave});

  @override
  State<_CampaignFormSheet> createState() => _CampaignFormSheetState();
}

class _CampaignFormSheetState extends State<_CampaignFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _type = 'phishing';
  String? _templateKey;
  bool _usesAi = false;
  String _startDate = '';
  String _endDate = '';
  final Set<String> _selected = {};

  @override
  void initState() {
    super.initState();
    final c = widget.campaign;
    if (c != null) {
      _nameCtrl.text = (c['name'] ?? '').toString();
      _descCtrl.text = (c['description'] ?? '').toString();
      _type = (c['type'] ?? 'phishing').toString();
      _startDate = (c['startDate'] ?? '').toString();
      _endDate = (c['endDate'] ?? '').toString();
      _usesAi = c['aiGeneratedTemplateId'] != null;
      _selected.addAll(((c['targetIds'] ?? const []) as List).map((e) => e.toString()));
      if (!_usesAi) {
        final existing = _type == 'phishing'
            ? c['emailTemplate']
            : _type == 'smishing'
                ? c['smsTemplate']
                : c['voiceScript'];
        final keys = _kTemplates[_type]!.map((t) => t['key']!).toList();
        _templateKey = keys.contains(existing) ? existing as String : keys.first;
      }
    } else {
      _templateKey = _kTemplates[_type]!.first['key'];
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isStart) async {
    final current = DateTime.tryParse(isStart ? _startDate : _endDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2000),
      lastDate: DateTime(DateTime.now().year + 5),
    );
    if (picked == null) return;
    final s = '${picked.year.toString().padLeft(4, '0')}-'
        '${picked.month.toString().padLeft(2, '0')}-'
        '${picked.day.toString().padLeft(2, '0')}';
    setState(() {
      if (isStart) {
        _startDate = s;
      } else {
        _endDate = s;
      }
    });
  }

  // Same shape the website sends for each type.
  List<Map<String, dynamic>> _targets() {
    return widget.employees
        .where((e) => _selected.contains(e['id'].toString()))
        .map<Map<String, dynamic>>((e) {
      final id = e['id'].toString();
      final email = (e['email'] ?? '').toString();
      final phone = (e['phoneNumber'] ?? '').toString();
      if (_type == 'phishing') return {'_id': id, 'email': email};
      if (_type == 'smishing') return {'_id': id, 'phone': phone};
      return {'_id': id, 'phone': phone, 'email': email};
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final allSelected = widget.employees.isNotEmpty && _selected.length == widget.employees.length;
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
              Text(widget.campaign != null ? 'Edit Campaign' : 'Create New Campaign', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 24),

              CustomTextField(
                label: 'Campaign Name',
                hint: 'Enter campaign name',
                controller: _nameCtrl,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Name required' : null,
              ),
              const SizedBox(height: 16),

              const Text('Campaign Type', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
              const SizedBox(height: 8),
              Row(children: ['phishing', 'smishing', 'vishing'].map((t) {
                final selected = _type == t;
                Color c;
                IconData ic;
                switch (t) {
                  case 'smishing': c = AppColors.yellow; ic = Icons.sms_outlined; break;
                  case 'vishing': c = AppColors.blue; ic = Icons.phone_outlined; break;
                  default: c = AppColors.red; ic = Icons.email_outlined;
                }
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() {
                        _type = t;
                        if (!_usesAi) _templateKey = _kTemplates[t]!.first['key'];
                      }),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: selected ? c.withOpacity(0.2) : AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: selected ? c : AppColors.border),
                        ),
                        child: Column(children: [
                          Icon(ic, color: selected ? c : AppColors.textMuted, size: 20),
                          const SizedBox(height: 4),
                          Text(t[0].toUpperCase() + t.substring(1), style: TextStyle(fontSize: 11, color: selected ? c : AppColors.textMuted)),
                        ]),
                      ),
                    ),
                  ),
                );
              }).toList()),
              const SizedBox(height: 16),

              const Text('Template', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
              const SizedBox(height: 8),
              if (_usesAi)
                const Text(
                  'This campaign uses an AI-generated scenario. Change its scenario on the website; the app keeps it as it is.',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                )
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _kTemplates[_type]!.map((t) {
                    final sel = _templateKey == t['key'];
                    return ChoiceChip(
                      label: Text(t['name']!),
                      selected: sel,
                      onSelected: (_) => setState(() => _templateKey = t['key']),
                    );
                  }).toList(),
                ),
              const SizedBox(height: 16),

              CustomTextField(
                label: 'Description',
                hint: 'Optional description...',
                controller: _descCtrl,
                maxLines: 3,
              ),
              const SizedBox(height: 16),

              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickDate(true),
                    icon: const Icon(Icons.event, size: 16),
                    label: Text(_startDate.isEmpty ? 'Start date' : _startDate),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickDate(false),
                    icon: const Icon(Icons.event_available, size: 16),
                    label: Text(_endDate.isEmpty ? 'End date' : _endDate),
                  ),
                ),
              ]),
              const SizedBox(height: 16),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Target Employees (${_selected.length} selected)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                  TextButton(
                    onPressed: () => setState(() {
                      if (allSelected) {
                        _selected.clear();
                      } else {
                        _selected
                          ..clear()
                          ..addAll(widget.employees.map((e) => e['id'].toString()));
                      }
                    }),
                    child: Text(allSelected ? 'Clear all' : 'Select all'),
                  ),
                ],
              ),
              Container(
                height: 220,
                decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                child: ListView.builder(
                  itemCount: widget.employees.length,
                  itemBuilder: (_, i) {
                    final emp = widget.employees[i];
                    final id = emp['id'].toString();
                    return CheckboxListTile(
                      dense: true,
                      value: _selected.contains(id),
                      title: Text((emp['name'] ?? '').toString(), style: const TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                      subtitle: Text((emp['department'] ?? '').toString(), style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      onChanged: (v) => setState(() {
                        if (v == true) {
                          _selected.add(id);
                        } else {
                          _selected.remove(id);
                        }
                      }),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Saving only stores the campaign as a draft. Nothing is sent until you launch it.',
                style: TextStyle(fontSize: 11, color: AppColors.textMuted),
              ),
              const SizedBox(height: 20),

              Row(children: [
                Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel'))),
                const SizedBox(width: 12),
                Expanded(child: GradientButton(
                  text: widget.campaign != null ? 'Update' : 'Create',
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      widget.onSave({
                        'name': _nameCtrl.text,
                        'type': _type,
                        'description': _descCtrl.text,
                        'startDate': _startDate,
                        'endDate': _endDate,
                        'templateKey': _usesAi ? null : _templateKey,
                        'targetEmployees': _targets(),
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
