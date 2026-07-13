import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';

class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const AppBottomNav({super.key, required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: onTap,
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: AppStrings.home),
        BottomNavigationBarItem(icon: Icon(Icons.search), label: AppStrings.explore),
        BottomNavigationBarItem(icon: Icon(Icons.notifications_none_outlined), label: AppStrings.notifications),
        BottomNavigationBarItem(icon: Icon(Icons.mail_outline_outlined), label: AppStrings.messages),
      ],
    );
  }
}
