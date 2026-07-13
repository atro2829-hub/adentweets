import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/string_utils.dart';
import '../../../core/utils/date_utils.dart';
import '../../../providers/posts/posts_provider.dart';
import '../../widgets/common/admin_drawer.dart';
import '../../widgets/loading/loading_widget.dart';
import '../../widgets/image/avatar_widget.dart';

class ModerationScreen extends ConsumerWidget {
  const ModerationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final postsAsync = ref.watch(allPostsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.moderation),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(allPostsProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AdminDrawer(),
      body: postsAsync.when(
        data: (posts) {
          if (posts.isEmpty) {
            return const Center(child: Text(AppStrings.noPosts));
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(allPostsProvider.notifier).refresh(),
            child: ListView.builder(
              itemCount: posts.length,
              padding: const EdgeInsets.all(AppDimens.paddingMedium),
              itemBuilder: (context, index) {
                final post = posts[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(AppDimens.paddingMedium),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            AvatarWidget(
                              base64Image: post.userProfileImage,
                              name: post.username,
                              size: AppDimens.avatarMedium,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    post.userFullName,
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                  Text(
                                    '@${post.username}',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              AppDateUtils.formatRelativeTime(post.createdAt),
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          post.content,
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                        if (post.image != null && post.image!.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              height: 200,
                              width: double.infinity,
                              color: Colors.grey[200],
                              child: const Icon(Icons.image, size: 48, color: Colors.grey),
                            ),
                          ),
                        ],
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Icon(Icons.favorite, size: 16, color: Colors.grey[500]),
                            const SizedBox(width: 4),
                            Text('${post.likesCount}', style: Theme.of(context).textTheme.bodySmall),
                            const SizedBox(width: 16),
                            Icon(Icons.comment, size: 16, color: Colors.grey[500]),
                            const SizedBox(width: 4),
                            Text('${post.commentsCount}', style: Theme.of(context).textTheme.bodySmall),
                            const SizedBox(width: 16),
                            Icon(Icons.repeat, size: 16, color: Colors.grey[500]),
                            const SizedBox(width: 4),
                            Text('${post.retweetsCount}', style: Theme.of(context).textTheme.bodySmall),
                            const Spacer(),
                            OutlinedButton.icon(
                              onPressed: () {
                                showDialog(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title: const Text(AppStrings.confirmAction),
                                    content: const Text(AppStrings.deleteConfirm),
                                    actions: [
                                      TextButton(
                                        onPressed: () => Navigator.pop(ctx),
                                        child: const Text(AppStrings.cancel),
                                      ),
                                      TextButton(
                                        onPressed: () {
                                          Navigator.pop(ctx);
                                          ref.read(postModerationProvider.notifier).deletePostAdmin(post.id, post.userId);
                                        },
                                        style: TextButton.styleFrom(foregroundColor: Colors.red),
                                        child: const Text(AppStrings.delete),
                                      ),
                                    ],
                                  ),
                                );
                              },
                              icon: const Icon(Icons.delete, size: 16),
                              label: const Text(AppStrings.delete),
                              style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const LoadingWidget(message: AppStrings.loading),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              Text(AppStrings.error),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.read(allPostsProvider.notifier).refresh(),
                child: const Text(AppStrings.tryAgain),
              ),
            ],
          ),
        ),
      ),
    );
  }
}