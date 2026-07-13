import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../providers/posts/posts_provider.dart';
import '../../widgets/cards/post_card.dart';
import '../../widgets/common/app_bar.dart';
import '../../widgets/loading/loading_widget.dart';
import '../../widgets/loading/skeleton_loader.dart';

class HomeScreen extends ConsumerWidget {
  final int selectedIndex;
  const HomeScreen({super.key, this.selectedIndex = 0});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: const AppAppBar(showLogo: true),
      body: _buildBody(context, ref),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push(RouteNames.createPost),
        backgroundColor: const Color(AppColors.primary),
        child: const Icon(Icons.edit, color: Colors.white, size: 28),
      ),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref) {
    final postsAsync = ref.watch(feedPostsProvider);
    return postsAsync.when(
      data: (posts) {
        if (posts.isEmpty) {
          return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.article_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(AppStrings.noPostsYet, style: TextStyle(color: Colors.grey[500])),
          ]));
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(feedPostsProvider),
          child: ListView.builder(
            itemCount: posts.length,
            itemBuilder: (context, index) => PostCard(
              post: posts[index],
              onTap: () => context.push('/post/${posts[index].id}'),
            ),
          ),
        );
      },
      loading: () => ListView.builder(itemCount: 5, itemBuilder: (context, index) => PostSkeleton()),
      error: (error, _) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.error_outline, size: 64, color: Colors.red),
        const SizedBox(height: 16),
        Text(error.toString(), textAlign: TextAlign.center),
        const SizedBox(height: 16),
        ElevatedButton(onPressed: () => ref.invalidate(feedPostsProvider), child: Text(AppStrings.tryAgain)),
      ])),
    );
  }
}
