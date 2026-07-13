import 'package:firebase_database/firebase_database.dart';
import '../models/message_model.dart';
import '../models/conversation_model.dart';
import '../../core/constants/app_constants.dart';

class MessageService {
  final DatabaseReference _dbRef = FirebaseDatabase.instance.ref();

  Future<String> createOrGetConversation({
    required String currentUserId,
    required String otherUserId,
    required String currentUserName,
    required String otherUserName,
    String? currentUserImage,
    String? otherUserImage,
  }) async {
    // Check if conversation exists
    final snapshot = await _dbRef.child(FirebasePaths.conversations)
        .orderByChild('participants')
        .startAt('[$currentUserId]')
        .get();
    if (snapshot.exists) {
      final data = Map<String, dynamic>.from(snapshot.value as Map);
      for (final entry in data.entries) {
        final participants = List<String>.from(entry.value['participants'] ?? []);
        if (participants.contains(currentUserId) && participants.contains(otherUserId)) {
          return entry.key;
        }
      }
    }
    final convRef = _dbRef.child(FirebasePaths.conversations).push();
    final convId = convRef.key!;
    final sortedParticipants = [currentUserId, otherUserId]..sort();
    await convRef.set({
      'participants': sortedParticipants,
      'participantNames': {currentUserId: currentUserName, otherUserId: otherUserName},
      'participantImages': {currentUserId: currentUserImage, otherUserId: otherUserImage},
      'lastMessage': '',
      'lastMessageTimestamp': DateTime.now().millisecondsSinceEpoch,
      'unreadCount': 0,
    });
    return convId;
  }

  Future<void> sendMessage({
    required String conversationId,
    required String senderId,
    required String content,
    String? image,
  }) async {
    final msgRef = _dbRef.child(FirebasePaths.messages).child(conversationId).push();
    await msgRef.set({
      'conversationId': conversationId,
      'senderId': senderId,
      'content': content,
      'image': image,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'isRead': false,
    });
    await _dbRef.child(FirebasePaths.conversations).child(conversationId).update({
      'lastMessage': content,
      'lastMessageTimestamp': DateTime.now().millisecondsSinceEpoch,
    });
  }

  Stream<List<ConversationModel>> fetchConversations(String userId) {
    return _dbRef.child(FirebasePaths.conversations).onValue.map((event) {
      final conversations = <ConversationModel>[];
      if (event.snapshot.exists) {
        final data = Map<String, dynamic>.from(event.snapshot.value as Map);
        data.forEach((key, value) {
          final conv = ConversationModel.fromMap(Map<String, dynamic>.from(value), key);
          if (conv.participants.contains(userId)) {
            conversations.add(conv);
          }
        });
        conversations.sort((a, b) => b.lastMessageTimestamp.compareTo(a.lastMessageTimestamp));
      }
      return conversations;
    });
  }

  Stream<List<MessageModel>> fetchMessages(String conversationId) {
    return _dbRef.child(FirebasePaths.messages).child(conversationId)
        .orderByChild('timestamp')
        .onValue
        .map((event) {
          final messages = <MessageModel>[];
          if (event.snapshot.exists) {
            final data = Map<String, dynamic>.from(event.snapshot.value as Map);
            data.forEach((key, value) {
              messages.add(MessageModel.fromMap(Map<String, dynamic>.from(value), key));
            });
            messages.sort((a, b) => a.timestamp.compareTo(b.timestamp));
          }
          return messages;
        });
  }

  Future<void> markAsRead(String conversationId, String userId) async {
    final snapshot = await _dbRef.child(FirebasePaths.messages).child(conversationId).get();
    if (snapshot.exists) {
      final data = Map<String, dynamic>.from(snapshot.value as Map);
      for (final entry in data.entries) {
        if (entry.value['senderId'] != userId && !(entry.value['isRead'] ?? false)) {
          await _dbRef.child(FirebasePaths.messages)
              .child(conversationId).child(entry.key).child('isRead').set(true);
        }
      }
    }
    await _dbRef.child(FirebasePaths.conversations).child(conversationId).child('unreadCount').set(0);
  }
}
