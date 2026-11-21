// lib/screens/learn/learn_screen.dart
import 'package:flutter/material.dart';

import '../quizzes/quizzes_screen.dart';
import '../videos/videos_screen.dart';

/// One tab that holds both learning lists, so the bottom bar stays short.
class LearnScreen extends StatefulWidget {
  const LearnScreen({super.key, this.active = true});

  /// False while another tab is showing; turning true refreshes the data.
  final bool active;

  @override
  State<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends State<LearnScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this)
      ..addListener(() {
        if (!_tabs.indexIsChanging && mounted) setState(() {});
      });
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: 'Videos'),
            Tab(text: 'Quizzes'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabs,
            children: [
              VideosScreen(active: widget.active && _tabs.index == 0),
              QuizzesScreen(active: widget.active && _tabs.index == 1),
            ],
          ),
        ),
      ],
    );
  }
}
