import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../providers/messages/messages_provider.dart';
import '../../../providers/auth/auth_provider.dart';
import '../../widgets/cards/conversation_card.dart';
import '../../widgets/loading/loading_widget.dart';

class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final conversationsAsync = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.messages, style: TextStyle(fontSize: 18))),
      body: conversationsAsync.when(
        data: (conversations) {
          if (user == null) return const LoadingWidget();
          if (conversations.isEmpty) return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.mail_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(AppStrings.noMessages, style: TextStyle(color: Colors.grey[500])),
          ]));
          return ListView.builder(itemCount: conversations.length, itemBuilder: (context, index) => ConversationCard(conversation: conversations[index], currentUserId: user.id, onTap: () {}));
        },
        loading: () => const LoadingWidget(),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
      floatingActionButton: FloatingActionButton(onPressed: () {}, backgroundColor: const Color(AppColors.primary), child: const Icon(Icons.edit, color: Colors.white)),
    );
  }
}
