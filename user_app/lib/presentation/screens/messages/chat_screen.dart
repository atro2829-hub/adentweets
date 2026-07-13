import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/date_utils.dart';
import '../../../providers/messages/messages_provider.dart';
import '../../../providers/auth/auth_provider.dart';
import '../../widgets/image/avatar_widget.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String conversationId;
  const ChatScreen({super.key, required this.conversationId});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _messageController = TextEditingController();
  String? _imageBase64;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_messageController.text.trim().isEmpty && _imageBase64 == null) return;
    await ref.read(messageCreationProvider.notifier).sendMessage(
      conversationId: widget.conversationId,
      content: _messageController.text.trim(),
      image: _imageBase64,
    );
    _messageController.clear();
    setState(() => _imageBase64 = null);
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final messagesAsync = ref.watch(messagesProvider(widget.conversationId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Chat', style: TextStyle(fontSize: 16))),
      body: Column(children: [
        Expanded(child: messagesAsync.when(
          data: (messages) => messages.isEmpty
              ? Center(child: Text(AppStrings.noMessages, style: TextStyle(color: Colors.grey[500])))
              : ListView.builder(
                  padding: const EdgeInsets.all(AppDimens.paddingMedium),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index];
                    final isMe = msg.senderId == user?.id;
                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
                        decoration: BoxDecoration(
                          color: isMe ? const Color(AppColors.primary) : (isDark ? const Color(0xFF22303C) : const Color(0xFFF0F0F0)),
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(18),
                            topRight: const Radius.circular(18),
                            bottomLeft: isMe ? const Radius.circular(18) : Radius.zero,
                            bottomRight: isMe ? Radius.zero : const Radius.circular(18),
                          ),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          if (msg.image != null && msg.image!.isNotEmpty) ...[
                            ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(base64Decode(msg.image!), width: 200)),
                            const SizedBox(height: 6),
                          ],
                          Text(msg.content, style: TextStyle(color: isMe ? Colors.white : (isDark ? const Color(0xFFE7E9EA) : Colors.black87))),
                          const SizedBox(height: 4),
                          Text(AppDateUtils.formatRelativeTime(msg.timestamp), style: TextStyle(fontSize: 11, color: isMe ? Colors.white70 : Colors.grey[500])),
                        ]),
                      ),
                    );
                  },
                ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Error: $e')),
        )),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(border: Border(top: BorderSide(color: Theme.of(context).dividerColor))),
          child: Row(children: [
            IconButton(icon: const Icon(Icons.image_outlined), onPressed: () async {
              final picker = ImagePicker();
              final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
              if (image != null) {
                final bytes = await image.readAsBytes();
                setState(() => _imageBase64 = base64Encode(bytes));
              }
            }),
            Expanded(child: TextField(controller: _messageController, decoration: InputDecoration(hintText: 'Write a message...', border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none), filled: true, fillColor: isDark ? const Color(0xFF22303C) : const Color(0xFFF5F5F5), contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)), maxLines: 3, minLines: 1)),
            IconButton(icon: const Icon(Icons.send, color: Color(AppColors.primary)), onPressed: _send),
          ]),
        ),
      ]),
    );
  }
}
