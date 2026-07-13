import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../providers/auth/auth_provider.dart';
import '../../../providers/ui/theme_provider.dart';
import '../../widgets/dialogs/confirmation_dialog.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);
    final isDark = themeMode == ThemeMode.dark;

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.settings, style: TextStyle(fontSize: 18))),
      body: ListView(children: [
        _SettingsSection(title: 'Account', items: [
          _SettingsTile(icon: Icons.person_outline, title: 'Your Account', onTap: () {}),
          _SettingsTile(icon: Icons.security, title: 'Security', onTap: () {}),
          _SettingsTile(icon: Icons.privacy_tip_outlined, title: 'Privacy', onTap: () {}),
        ]),
        _SettingsSection(title: 'Display', items: [
          SwitchListTile(
            secondary: Icon(isDark ? Icons.dark_mode : Icons.light_mode),
            title: Text(isDark ? AppStrings.darkMode : AppStrings.lightMode),
            value: isDark,
            onChanged: (_) => ref.read(themeProvider.notifier).toggleTheme(),
          ),
        ]),
        _SettingsSection(title: AppStrings.notifications, items: [
          SwitchListTile(secondary: const Icon(Icons.push_pin_outlined), title: const Text('Push Notifications'), value: true, onChanged: (_) {}),
          SwitchListTile(secondary: const Icon(Icons.email_outlined), title: const Text('Email Notifications'), value: false, onChanged: (_) {}),
        ]),
        _SettingsSection(title: 'About', items: [
          _SettingsTile(icon: Icons.info_outline, title: AppStrings.about, trailing: const Text('v1.0.0', style: TextStyle(color: Colors.grey))),
          _SettingsTile(icon: Icons.description_outlined, title: AppStrings.termsOfService, onTap: () {}),
          _SettingsTile(icon: Icons.shield_outlined, title: AppStrings.privacyPolicy, onTap: () {}),
          _SettingsTile(icon: Icons.help_outline, title: AppStrings.helpCenter, onTap: () {}),
        ]),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppDimens.paddingLarge),
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () async {
              final confirmed = await ConfirmationDialog.show(context: context, title: AppStrings.logout, message: 'Are you sure you want to logout?', confirmText: AppStrings.logout, isDestructive: true);
              if (confirmed == true) {
                await ref.read(logoutProvider.notifier).logout();
                if (context.mounted) context.go(RouteNames.login);
              }
            },
            child: Text(AppStrings.logout),
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppDimens.paddingLarge),
          child: TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () async {
              final confirmed = await ConfirmationDialog.show(context: context, title: AppStrings.deleteAccount, message: 'This action cannot be undone. All your data will be permanently deleted.', confirmText: AppStrings.deleteAccount, isDestructive: true);
            },
            child: const Text(AppStrings.deleteAccount),
          ),
        ),
        const SizedBox(height: 32),
      ]),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final List<Widget> items;
  const _SettingsSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.fromLTRB(AppDimens.paddingLarge, 16, AppDimens.paddingLarge, 8), child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1DA1F2)))),
      ...items,
    ]);
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _SettingsTile({required this.icon, required this.title, this.trailing, this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(leading: Icon(icon), title: Text(title), trailing: trailing ?? (onTap != null ? const Icon(Icons.chevron_right) : null), onTap: onTap);
  }
}
