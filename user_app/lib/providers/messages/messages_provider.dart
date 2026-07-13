import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/message_model.dart';
import '../../data/models/conversation_model.dart';
import '../../data/services/message_service.dart';
import '../auth/auth_provider.dart';

final messageServiceProvider = Provider<MessageService>((ref) => MessageService());

final conversationsProvider = StreamProvider<List<ConversationModel>>((ref) {
  final user = ref.watch(currentUserProvider);
  if (user == null) return Stream.value([]);
  return ref.read(messageServiceProvider).fetchConversations(user.id);
});

final messagesProvider = StreamProvider.family<List<MessageModel>, String>((ref, conversationId) {
  return ref.read(messageServiceProvider).fetchMessages(conversationId);
});

final messageCreationProvider = StateNotifierProvider<MessageCreationNotifier, AsyncValue<void>>((ref) {
  return MessageCreationNotifier(ref);
});

class MessageCreationNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  MessageCreationNotifier(this._ref) : super(const AsyncData(null));

  Future<void> sendMessage({
    required String conversationId,
    required String content,
    String? image,
  }) async {
    try {
      final user = _ref.read(currentUserProvider);
      if (user == null) return;
      await _ref.read(messageServiceProvider).sendMessage(
            conversationId: conversationId,
            senderId: user.id,
            content: content,
            image: image,
          );
    } catch (e) {
      debugPrint('Error sending message: $e');
    }
  }
}
