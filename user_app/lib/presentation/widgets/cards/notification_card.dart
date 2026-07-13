import 'package:flutter/material.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/constants/app_constants.dart';
import '../../../data/models/notification_model.dart';
import '../image/avatar_widget.dart';

class NotificationCard extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback? onTap;

  const NotificationCard({super.key, required this.notification, this.onTap});

  IconData get _typeIcon {
    switch (notification.type) {
      case 'like': return Icons.favorite;
      case 'comment': return Icons.comment;
      case 'follow': return Icons.person_add;
      case 'message': return Icons.mail;
      case 'mention': return Icons.alternate_email;
      case 'retweet': return Icons.repeat;
      default: return Icons.notifications;
    }
  }

  Color get _typeColor {
    switch (notification.type) {
      case 'like': return const Color(AppColors.like);
      case 'comment': return const Color(AppColors.primary);
      case 'follow': return const Color(AppColors.primary);
      case 'message': return const Color(AppColors.primary);
      case 'mention': return const Color(AppColors.primary);
      case 'retweet': return const Color(AppColors.retweet);
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ListTile(
      onTap: onTap,
      leading: Stack(children: [
        AvatarWidget(base64Image: notification.actorImage, name: notification.actorName, size: 44),
        Positioned(bottom: 0, right: 0, child: Container(
          padding: const EdgeInsets.all(2), decoration: BoxDecoration(color: isDark ? const Color(0xFF15202B) : Colors.white, shape: BoxShape.circle),
          child: Icon(_typeIcon, color: _typeColor, size: 14),
        )),
      ]),
      title: RichText(
        text: TextSpan(style: TextStyle(fontSize: 14, color: isDark ? const Color(0xFFE7E9EA) : Colors.black87), children: [
          TextSpan(text: notification.actorName, style: const TextStyle(fontWeight: FontWeight.bold)),
          TextSpan(text: ' ${notification.message}', style: TextStyle(color: isDark ? const Color(0xFF71767B) : const Color(0xFF6B7280))),
        ]),
      ),
      subtitle: Text(AppDateUtils.formatRelativeTime(notification.createdAt), style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF71767B) : const Color(0xFF6B7280))),
      trailing: !notification.isRead ? Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(AppColors.primary), shape: BoxShape.circle)) : null,
    );
  }
}
