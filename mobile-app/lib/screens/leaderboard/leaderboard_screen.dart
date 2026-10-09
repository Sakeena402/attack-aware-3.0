// lib/screens/leaderboard/leaderboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> with SingleTickerProviderStateMixin {
  String _filterDept = 'all';
  late TabController _tabController;

  List<Map<String, dynamic>> _leaderboard = [];
  bool _loading = true;
  String? _error;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await context.read<AuthProvider>().data.leaderboard();
      if (mounted) setState(() => _leaderboard = rows);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<String> get departments =>
      ['all', ...{..._leaderboard.map((e) => e['department'].toString())}];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filtered {
    if (_filterDept == 'all') return _leaderboard;
    return _leaderboard.where((e) => e['department'] == _filterDept).toList();
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
    final myId = auth.user?.id ?? '';
    final myRankIdx = _leaderboard.indexWhere((e) => e['userId'] == myId);
    final top3 = _filtered.take(3).toList();
    final rest = _filtered.skip(3).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: 'Leaderboard', subtitle: 'See how your team compares in cybersecurity awareness'),
          const SizedBox(height: 20),

          // Your Rank Card (if found)
          if (myRankIdx >= 0) ...[
            CyberCard(
              borderColor: AppColors.purple.withOpacity(0.5),
              gradient: LinearGradient(colors: [AppColors.purple.withOpacity(0.2), AppColors.blue.withOpacity(0.2)]),
              child: Row(
                children: [
                  Container(
                    width: 52, height: 52,
                    decoration: BoxDecoration(gradient: AppColors.primaryGradient, shape: BoxShape.circle),
                    alignment: Alignment.center,
                    child: Text('#${myRankIdx + 1}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Your Ranking', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                        Text('${_leaderboard[myRankIdx]['score']} points', style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('Keep going!', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      Text(
                        myRankIdx > 0 ? '${(_leaderboard[myRankIdx - 1]['score'] as int) - (_leaderboard[myRankIdx]['score'] as int)} pts to next rank' : 'You are #1! 🎉',
                        style: const TextStyle(fontSize: 12, color: AppColors.purple, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Department filter
          FilterChipRow(options: departments, selected: _filterDept, onSelected: (v) => setState(() => _filterDept = v)),
          const SizedBox(height: 20),

          // TabBar: Podium / Table
          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: '🏆 Podium'),
              Tab(text: '📋 Full Table'),
            ],
          ),
          const SizedBox(height: 20),

          SizedBox(
            height: 1200,
            child: TabBarView(
              controller: _tabController,
              children: [
                // ── Podium Tab ──
                Column(
                  children: [
                    if (top3.length >= 3) _buildPodium(top3),
                    const SizedBox(height: 20),
                    ..._buildRestList(rest, myId),
                  ],
                ),
                // ── Full Table Tab ──
                _buildFullTable(myId),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPodium(List<Map<String, dynamic>> top3) {
    return SizedBox(
      height: 220,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // 2nd
          Expanded(child: _PodiumItem(entry: top3[1], rank: 2, height: 140, color: Colors.grey)),
          // 1st
          Expanded(child: _PodiumItem(entry: top3[0], rank: 1, height: 180, color: AppColors.yellow)),
          // 3rd
          Expanded(child: _PodiumItem(entry: top3[2], rank: 3, height: 110, color: AppColors.orange)),
        ],
      ),
    );
  }

  List<Widget> _buildRestList(List<Map<String, dynamic>> entries, String myId) {
    return entries.asMap().entries.map((e) {
      final idx = e.key + 4;
      final entry = e.value;
      final isMe = entry['userId'] == myId;
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: _LeaderboardRow(entry: entry, rank: idx, isMe: isMe),
      );
    }).toList();
  }

  Widget _buildFullTable(String myId) {
    return CyberCard(
      borderColor: AppColors.purple.withOpacity(0.2),
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          // Header row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(color: AppColors.surface.withOpacity(0.5), borderRadius: const BorderRadius.vertical(top: Radius.circular(16))),
            child: const Row(
              children: [
                SizedBox(width: 44, child: Text('Rank', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
                Expanded(child: Text('Employee', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
                SizedBox(width: 70, child: Text('Dept', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted), textAlign: TextAlign.center)),
                SizedBox(width: 60, child: Text('Points', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted), textAlign: TextAlign.right)),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          ..._filtered.asMap().entries.map((e) {
            final idx = e.key;
            final entry = e.value;
            final isMe = entry['userId'] == myId;
            return Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  color: isMe ? AppColors.purple.withOpacity(0.1) : Colors.transparent,
                  child: Row(
                    children: [
                      SizedBox(width: 44, child: RankBadge(rank: idx + 1)),
                      Expanded(
                        child: Row(
                          children: [
                            UserAvatar(name: entry['userName'] ?? '?', radius: 14),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isMe ? '${entry['userName']} (You)' : entry['userName'] ?? '',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: isMe ? AppColors.purple : AppColors.textPrimary),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  _BadgeChip(badge: entry['badge'] ?? 'Rookie'),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: 70, child: Text(entry['department'] ?? 'N/A', style: const TextStyle(fontSize: 11, color: AppColors.textMuted), textAlign: TextAlign.center, overflow: TextOverflow.ellipsis)),
                      SizedBox(
                        width: 60,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            _TrendIcon(trend: entry['trend'] ?? 'stable'),
                            const SizedBox(width: 2),
                            Text('${entry['score']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.purple), textAlign: TextAlign.right),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (idx < _filtered.length - 1) const Divider(height: 1, color: AppColors.border),
              ],
            );
          }),
        ],
      ),
    );
  }
}

class _PodiumItem extends StatelessWidget {
  final Map<String, dynamic> entry;
  final int rank;
  final double height;
  final Color color;

  const _PodiumItem({required this.entry, required this.rank, required this.height, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (rank == 1) Icon(Icons.workspace_premium, color: AppColors.yellow, size: 28),
        Stack(
          alignment: Alignment.topRight,
          children: [
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [color.withOpacity(0.8), color], begin: Alignment.topLeft, end: Alignment.bottomRight)),
              alignment: Alignment.center,
              child: Text(
                (entry['userName'] as String?)?.isNotEmpty == true ? (entry['userName'] as String)[0] : '?',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 22),
              ),
            ),
            Container(
              width: 20, height: 20,
              decoration: BoxDecoration(shape: BoxShape.circle, color: color),
              alignment: Alignment.center,
              child: Text('$rank', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10)),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          (entry['userName'] as String?)?.split(' ').first ?? '',
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          textAlign: TextAlign.center,
          overflow: TextOverflow.ellipsis,
        ),
        Text('${entry['score']} pts', style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        Container(
          height: height * 0.5,
          width: double.infinity,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [color.withOpacity(0.3), color.withOpacity(0.1)], begin: Alignment.topCenter, end: Alignment.bottomCenter),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
          ),
        ),
      ],
    );
  }
}

class _LeaderboardRow extends StatelessWidget {
  final Map<String, dynamic> entry;
  final int rank;
  final bool isMe;

  const _LeaderboardRow({required this.entry, required this.rank, required this.isMe});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: isMe ? LinearGradient(colors: [AppColors.purple.withOpacity(0.2), AppColors.blue.withOpacity(0.1)]) : null,
        color: isMe ? null : AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: isMe ? Border.all(color: AppColors.purple.withOpacity(0.4)) : null,
      ),
      child: Row(
        children: [
          SizedBox(width: 36, child: Text('$rank', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textMuted), textAlign: TextAlign.center)),
          UserAvatar(name: entry['userName'] ?? '?', radius: 16),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(isMe ? 'YOU' : (entry['userName'] ?? ''), style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isMe ? AppColors.purple : AppColors.textPrimary)),
                Text(entry['department'] ?? 'N/A', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
              ],
            ),
          ),
          _BadgeChip(badge: entry['badge'] ?? 'Rookie'),
          const SizedBox(width: 8),
          _TrendIcon(trend: entry['trend'] ?? 'stable'),
          const SizedBox(width: 4),
          Text('${entry['score']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.purple)),
        ],
      ),
    );
  }
}

class _BadgeChip extends StatelessWidget {
  final String badge;
  const _BadgeChip({required this.badge});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (badge.toLowerCase()) {
      case 'champion': case 'expert': color = AppColors.purple; break;
      case 'guardian': case 'defender': color = AppColors.blue; break;
      case 'aware': color = AppColors.green; break;
      default: color = AppColors.textMuted;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withOpacity(0.3))),
      child: Text(badge, style: TextStyle(fontSize: 9, color: color, fontWeight: FontWeight.w700)),
    );
  }
}

class _TrendIcon extends StatelessWidget {
  final String trend;
  const _TrendIcon({required this.trend});

  @override
  Widget build(BuildContext context) {
    switch (trend) {
      case 'up':   return const Icon(Icons.trending_up,   color: AppColors.green,   size: 14);
      case 'down': return const Icon(Icons.trending_down, color: AppColors.red,     size: 14);
      default:     return const Icon(Icons.remove,         color: AppColors.textMuted, size: 14);
    }
  }
}