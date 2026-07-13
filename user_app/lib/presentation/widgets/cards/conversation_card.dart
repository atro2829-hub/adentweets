import 'package:flutter/material.dart';
import '../../../core/utils/date_utils.dart';
import '../../../data/models/conversation_model.dart';
import '../image/avatar_widget.dart';

class ConversationCard extends StatelessWidget {
  final ConversationModel conversation;
  final String currentUserId;
  final VoidCallback? onTap;

  const ConversationCard({super.key, required this.conversation, required this.currentUserId, this.onTap});

  @override
  Widget build(BuildContext context) {
    final otherUserId = conversation.participants.firstWhere((id) => id != currentUserId, orElse: () => '');
    final otherName = conversation.participantNames[otherUserId] ?? 'Unknown';
    final otherImage = conversation.participantImages[otherUserId];
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ListTile(
      onTap: onTap,
      leading: AvatarWidget(base64Image: otherImage, name: otherName, size: 52),
      title: Text(otherName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
      subtitle: Text(
        conversation.lastMessage.isEmpty ? 'No messages yet' : conversation.lastMessage,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 13, color: isDark ? const Color(0xFF71767B) : const Color(0xFF6B7280)),
      ),
      trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text(AppDateUtils.formatRelativeTime(conversation.lastMessageTimestamp), style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF71767B) : const Color(0xFF6B7280))),
        if (conversation.unreadCount > 0) ...[
          const SizedBox(height: 4),
          Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: const BoxDecoration(color: Color(0xFF1DA1F2), shape: BoxShape.circle), child: Text('${conversation.unreadCount}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))),
        ],
      ]),
    );
  }
}
