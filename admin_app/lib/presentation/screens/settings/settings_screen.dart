import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../providers/auth/auth_provider.dart';
import '../../../providers/ui/theme_provider.dart';
import '../../widgets/common/admin_drawer.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.settings),
      ),
      drawer: const AdminDrawer(),
      body: ListView(
        children: [
          Card(
            margin: const EdgeInsets.all(AppDimens.paddingMedium),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(AppDimens.paddingMedium),
                  child: Text(
                    'Appearance',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                SwitchListTile(
                  title: const Text(AppStrings.darkMode),
                  subtitle: Text(
                    themeMode == ThemeMode.dark ? 'Dark theme is active' : 'Light theme is active',
                  ),
                  secondary: Icon(
                    themeMode == ThemeMode.dark ? Icons.dark_mode : Icons.light_mode,
                    color: const Color(AppColors.primary),
                  ),
                  value: themeMode == ThemeMode.dark,
                  onChanged: (value) {
                    ref.read(themeProvider.notifier).toggleTheme();
                  },
                ),
              ],
            ),
          ),
          Card(
            margin: const EdgeInsets.all(AppDimens.paddingMedium),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(AppDimens.paddingMedium),
                  child: Text(
                    'Account',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: const Text(AppStrings.logout, style: TextStyle(color: Colors.red)),
                  subtitle: const Text('Sign out of admin account'),
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Sign Out'),
                        content: const Text('Are you sure you want to sign out?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text(AppStrings.cancel),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.pop(ctx);
                              ref.read(logoutProvider.notifier).logout();
                              context.go(RouteNames.login);
                            },
                            child: const Text(AppStrings.logout, style: TextStyle(color: Colors.red)),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          Card(
            margin: const EdgeInsets.all(AppDimens.paddingMedium),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(AppDimens.paddingMedium),
                  child: Text(
                    'About',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                const ListTile(
                  leading: Icon(Icons.info_outline),
                  title: Text('Version'),
                  subtitle: Text('1.0.0'),
                ),
                const ListTile(
                  leading: Icon(Icons.code),
                  title: Text('Package'),
                  subtitle: Text('com.adentweets.admin'),
                ),
                const ListTile(
                  leading: Icon(Icons.storage),
                  title: Text('Firebase Project'),
                  subtitle: Text('adentweet'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}