import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/notification_model.dart';
import '../../data/services/notification_service.dart';
import '../auth/auth_provider.dart';

final notificationServiceProvider = Provider<NotificationService>((ref) => NotificationService());

final notificationsProvider = StreamProvider<List<NotificationModel>>((ref) {
  final user = ref.watch(currentUserProvider);
  if (user == null) return Stream.value([]);
  return ref.read(notificationServiceProvider).fetchNotifications(user.id);
});

final notificationCountProvider = StreamProvider<int>((ref) {
  final user = ref.watch(currentUserProvider);
  if (user == null) return Stream.value(0);
  return ref.read(notificationServiceProvider).getUnreadCount(user.id);
});
