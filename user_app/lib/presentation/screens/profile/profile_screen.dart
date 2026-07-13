import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/string_utils.dart';
import '../../../providers/auth/auth_provider.dart';
import '../../../providers/posts/posts_provider.dart';
import '../../../providers/user/user_provider.dart';
import '../../widgets/image/avatar_widget.dart';
import '../../widgets/image/base64_image.dart';
import '../../widgets/cards/post_card.dart';
import '../../widgets/loading/loading_widget.dart';

class ProfileScreen extends ConsumerWidget {
  final String? userId;
  const ProfileScreen({super.key, this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(currentUserProvider);
    final isOwnProfile = userId == null || userId == currentUser?.id;
    final targetId = userId ?? currentUser?.id ?? '';

    if (targetId.isEmpty) return const Scaffold(body: LoadingWidget());

    return Scaffold(
      body: DefaultTabController(
        length: 3,
        child: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverAppBar(expandedHeight: 200, pinned: true, flexibleSpace: FlexibleSpaceBar(background: Stack(fit: StackFit.expand, children: [
              if (isOwnProfile && currentUser?.bannerImage != null)
                Base64Image(base64String: currentUser?.bannerImage, width: double.infinity, height: 200)
              else
                Container(color: const Color(AppColors.primary).withOpacity(0.3), width: double.infinity, height: 200),
            ]))),
            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppDimens.paddingMedium),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Transform.translate(offset: const Offset(0, -40), child: AvatarWidget(base64Image: isOwnProfile ? currentUser?.profileImage : null, name: isOwnProfile ? currentUser?.fullName : '', size: 80)),
                const SizedBox(height: 8),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(isOwnProfile ? (currentUser?.fullName ?? '') : '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    Text('@${isOwnProfile ? (currentUser?.username ?? '') : ''}', style: TextStyle(color: Colors.grey[600], fontSize: 14)),
                  ])),
                  if (isOwnProfile)
                    OutlinedButton(onPressed: () => context.push(RouteNames.editProfile), child: Text(AppStrings.editProfile))
                  else
                    ElevatedButton(onPressed: () {}, child: Text(AppStrings.followers)),
                ]),
                const SizedBox(height: 12),
                Text(isOwnProfile ? (currentUser?.bio ?? '') : '', style: const TextStyle(fontSize: 14)),
                const SizedBox(height: 16),
                Row(children: [
                  _StatItem(count: isOwnProfile ? (currentUser?.followingCount ?? 0) : 0, label: AppStrings.following),
                  const SizedBox(width: 24),
                  _StatItem(count: isOwnProfile ? (currentUser?.followersCount ?? 0) : 0, label: AppStrings.followers),
                ]),
                const SizedBox(height: 8),
              ]),
            )),
            const SliverPersistentHeader(
              pinned: true,
              delegate: _TabBarDelegate(TabBar(tabs: [Tab(text: AppStrings.posts), Tab(text: AppStrings.replies), Tab(text: AppStrings.likes)])),
            ),
          ],
          body: isOwnProfile ? _buildOwnPosts(ref, targetId) : const Center(child: Text('User profile')),
        ),
      ),
    );
  }

  Widget _buildOwnPosts(WidgetRef ref, String userId) {
    final postsAsync = ref.watch(userPostsProvider(userId));
    return postsAsync.when(
      data: (posts) => posts.isEmpty
          ? const Center(child: Text(AppStrings.noPostsYet, style: TextStyle(color: Colors.grey)))
          : ListView.builder(itemCount: posts.length, itemBuilder: (context, index) => PostCard(post: posts[index])),
      loading: () => const LoadingWidget(),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }
}

class _StatItem extends StatelessWidget {
  final int count;
  final String label;
  const _StatItem({required this.count, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.end, children: [
      Text(StringUtils.formatNumber(count), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      const SizedBox(width: 4),
      Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 14)),
    ]);
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  const _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;
  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) => tabBar;
  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}
