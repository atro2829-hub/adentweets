import 'package:firebase_database/firebase_database.dart';
import '../models/notification_model.dart';
import '../../core/constants/app_constants.dart';

class NotificationService {
  final DatabaseReference _dbRef = FirebaseDatabase.instance.ref();

  Future<void> createNotification({
    required String userId,
    required String type,
    required String actorId,
    required String actorName,
    String? actorImage,
    String? postId,
    required String message,
  }) async {
    final notifRef = _dbRef.child(FirebasePaths.notifications).child(userId).push();
    await notifRef.set({
      'userId': userId,
      'type': type,
      'actorId': actorId,
      'actorName': actorName,
      'actorImage': actorImage,
      'postId': postId,
      'message': message,
      'isRead': false,
      'createdAt': DateTime.now().millisecondsSinceEpoch,
    });
  }

  Stream<List<NotificationModel>> fetchNotifications(String userId) {
    return _dbRef.child(FirebasePaths.notifications).child(userId)
        .orderByChild('createdAt')
        .limitToLast(50)
        .onValue
        .map((event) {
          final notifications = <NotificationModel>[];
          if (event.snapshot.exists) {
            final data = Map<String, dynamic>.from(event.snapshot.value as Map);
            data.forEach((key, value) {
              notifications.add(NotificationModel.fromMap(
                  Map<String, dynamic>.from(value), key));
            });
            notifications.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          }
          return notifications;
        });
  }

  Future<void> markAsRead(String userId, String notificationId) async {
    await _dbRef.child(FirebasePaths.notifications).child(userId)
        .child(notificationId).child('isRead').set(true);
  }

  Future<void> markAllAsRead(String userId) async {
    final snapshot = await _dbRef.child(FirebasePaths.notifications).child(userId).get();
    if (snapshot.exists) {
      final data = Map<String, dynamic>.from(snapshot.value as Map);
      for (final key in data.keys) {
        await _dbRef.child(FirebasePaths.notifications).child(userId)
            .child(key).child('isRead').set(true);
      }
    }
  }

  Stream<int> getUnreadCount(String userId) {
    return _dbRef.child(FirebasePaths.notifications).child(userId).onValue.map((event) {
      int count = 0;
      if (event.snapshot.exists) {
        final data = Map<String, dynamic>.from(event.snapshot.value as Map);
        data.forEach((key, value) {
          if (!(value['isRead'] ?? false)) count++;
        });
      }
      return count;
    });
  }
}
