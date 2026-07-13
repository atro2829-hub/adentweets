import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';

class AdminDrawer extends ConsumerWidget {
  const AdminDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Drawer(
      child: Column(
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: theme.primaryColor,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Icon(
                  Icons.admin_panel_settings,
                  color: Colors.white,
                  size: 40,
                ),
                const SizedBox(height: 12),
                Text(
                  AppStrings.appName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  AppStrings.tagline,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard_outlined),
            title: const Text(AppStrings.dashboard),
            onTap: () {
              Navigator.pop(context);
              context.go(RouteNames.dashboard);
            },
          ),
          ListTile(
            leading: const Icon(Icons.people_outlined),
            title: const Text(AppStrings.users),
            onTap: () {
              Navigator.pop(context);
              context.go(RouteNames.users);
            },
          ),
          ListTile(
            leading: const Icon(Icons.content_copy_outlined),
            title: const Text(AppStrings.moderation),
            onTap: () {
              Navigator.pop(context);
              context.go(RouteNames.moderation);
            },
          ),
          ListTile(
            leading: const Icon(Icons.flag_outlined),
            title: const Text(AppStrings.reports),
            onTap: () {
              Navigator.pop(context);
              context.go(RouteNames.reports);
            },
          ),
          ListTile(
            leading: const Icon(Icons.bar_chart_outlined),
            title: const Text(AppStrings.analytics),
            onTap: () {
              Navigator.pop(context);
              context.go(RouteNames.analytics);
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text(AppStrings.settings),
            onTap: () {
              Navigator.pop(context);
              context.go(RouteNames.settings);
            },
          ),
          const Spacer(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text(AppStrings.logout, style: TextStyle(color: Colors.red)),
            onTap: () {
              Navigator.pop(context);
              context.go(RouteNames.login);
            },
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}