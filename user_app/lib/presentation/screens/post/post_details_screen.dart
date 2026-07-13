import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_constants.dart';
import '../../../data/services/comment_service.dart';
import '../../../providers/posts/posts_provider.dart';
import '../../../providers/auth/auth_provider.dart';
import '../../widgets/cards/post_card.dart';
import '../../widgets/cards/comment_card.dart';
import '../../widgets/image/avatar_widget.dart';
import '../../widgets/loading/loading_widget.dart';

class PostDetailsScreen extends ConsumerStatefulWidget {
  final String postId;
  const PostDetailsScreen({super.key, required this.postId});

  @override
  ConsumerState<PostDetailsScreen> createState() => _PostDetailsScreenState();
}

class _PostDetailsScreenState extends ConsumerState<PostDetailsScreen> {
  final _commentController = TextEditingController();
  String? _commentImage;
  late final CommentService _commentService;
  late final Stream<List<dynamic>> _commentsStream;

  @override
  void initState() {
    super.initState();
    _commentService = CommentService();
    _commentsStream = _commentService.fetchComments(widget.postId).map((list) => list);
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _pickCommentImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (image != null) {
      final bytes = await image.readAsBytes();
      setState(() => _commentImage = base64Encode(bytes));
    }
  }

  Future<void> _sendComment() async {
    if (_commentController.text.trim().isEmpty && _commentImage == null) return;
    final user = ref.read(currentUserProvider);
    if (user == null) return;
    await _commentService.createComment(
      postId: widget.postId, userId: user.id, username: user.username,
      userFullName: user.fullName, userProfileImage: user.profileImage,
      content: _commentController.text.trim(), image: _commentImage,
    );
    _commentController.clear();
    setState(() => _commentImage = null);
  }

  @override
  Widget build(BuildContext context) {
    final postAsync = ref.watch(feedPostsProvider);
    final post = postAsync.valueOrNull?.where((p) => p.id == widget.postId).firstOrNull;

    return Scaffold(
      appBar: AppBar(title: const Text('Post', style: TextStyle(fontSize: 16))),
      body: Column(children: [
        Expanded(child: post != null
            ? StreamBuilder<List<dynamic>>(
                stream: _commentsStream,
                builder: (context, snapshot) {
                  return ListView(children: [
                    PostCard(post: post, showActions: false),
                    const Divider(height: 1, thickness: 1),
                    Padding(padding: const EdgeInsets.all(AppDimens.paddingMedium), child: Text('Replies', style: Theme.of(context).textTheme.titleMedium)),
                    if (snapshot.hasData && snapshot.data!.isNotEmpty)
                      ...snapshot.data!.map((c) => Padding(padding: const EdgeInsets.symmetric(horizontal: AppDimens.paddingMedium), child: Column(children: [
                        ListTile(
                          leading: AvatarWidget(base64Image: c.userProfileImage, name: c.userFullName, size: 36),
                          title: Text(c.userFullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          subtitle: Text(c.content, style: const TextStyle(fontSize: 14)),
                        ),
                        const Divider(height: 1),
                      ])))
                    else
                      Center(child: Padding(padding: const EdgeInsets.all(32), child: Text('No replies yet', style: TextStyle(color: Colors.grey[500])))),
                  ]);
                },
              )
            : const LoadingWidget()),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: AppDimens.paddingMedium, vertical: 8),
          decoration: BoxDecoration(border: Border(top: BorderSide(color: Theme.of(context).dividerColor))),
          child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            AvatarWidget(base64Image: ref.watch(currentUserProvider)?.profileImage, name: ref.watch(currentUserProvider)?.fullName, size: 32),
            const SizedBox(width: 8),
            Expanded(child: TextField(controller: _commentController, decoration: const InputDecoration(hintText: 'Post your reply', border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(24))), contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8)), maxLines: 3, minLines: 1)),
            const SizedBox(width: 8),
            IconButton(icon: const Icon(Icons.image_outlined, color: Color(AppColors.primary)), onPressed: _pickCommentImage),
            IconButton(icon: const Icon(Icons.send, color: Color(AppColors.primary)), onPressed: _sendComment),
          ]),
        ),
      ]),
    );
  }
}
