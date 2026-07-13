import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';

class AppAppBar extends ConsumerWidget implements PreferredSizeWidget {
  final String? title;
  final bool showLogo;
  final List<Widget>? actions;

  const AppAppBar({super.key, this.title, this.showLogo = false, this.actions});

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AppBar(
      title: showLogo
          ? Row(
              children: [
                Icon(Icons.alternate_email, color: Theme.of(context).colorScheme.primary, size: 28),
                const SizedBox(width: 4),
                Text(AppStrings.appName, style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
              ],
            )
          : Text(title ?? ''),
      centerTitle: false,
      actions: actions,
    );
  }
}
