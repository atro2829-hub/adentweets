import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../providers/notifications/notifications_provider.dart';
import '../../widgets/cards/notification_card.dart';
import '../../widgets/loading/loading_widget.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.notifications, style: TextStyle(fontSize: 18))),
      body: notificationsAsync.when(
        data: (notifications) {
          if (notifications.isEmpty) return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.notifications_none_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(AppStrings.noNotifications, style: TextStyle(color: Colors.grey[500])),
          ]));
          return ListView.builder(itemCount: notifications.length, itemBuilder: (context, index) => NotificationCard(notification: notifications[index]));
        },
        loading: () => const LoadingWidget(),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
