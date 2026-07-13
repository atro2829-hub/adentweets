import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../providers/posts/posts_provider.dart';
import '../../../providers/user/user_provider.dart';
import '../../widgets/cards/post_card.dart';
import '../../widgets/cards/user_card.dart';
import '../../widgets/loading/loading_widget.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _searchController = TextEditingController();
  int _selectedTab = 0;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(slivers: [
        SliverAppBar(pinned: true, title: TextField(
          controller: _searchController,
          decoration: InputDecoration(hintText: AppStrings.search, filled: true, fillColor: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF22303C) : const Color(0xFFF5F5F5), border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none), contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), suffixIcon: IconButton(icon: const Icon(Icons.search), onPressed: () {
            if (_searchController.text.isNotEmpty) {
              ref.read(userSearchProvider.notifier).search(_searchController.text);
            }
          })),
        ), bottom: TabBar(onTap: (i) => setState(() => _selectedTab = i), tabs: const [Tab(text: 'For You'), Tab(text: 'Trending'), Tab(text: 'People')], labelColor: Theme.of(context).colorScheme.primary, unselectedLabelColor: Colors.grey, indicatorColor: Theme.of(context).colorScheme.primary)),
        SliverFillRemaining(child: _buildTabContent()),
      ]),
    );
  }

  Widget _buildTabContent() {
    switch (_selectedTab) {
      case 0:
        final postsAsync = ref.watch(trendingPostsProvider);
        return postsAsync.when(data: (posts) => posts.isEmpty ? const Center(child: Text(AppStrings.noPostsYet)) : ListView.builder(itemCount: posts.length, itemBuilder: (context, index) => PostCard(post: posts[index])), loading: () => const LoadingWidget(), error: (e, _) => Center(child: Text('Error: $e')));
      case 1:
        return ListView(children: ['#AdenTweets', '#SocialMedia', '#Trending', '#Flutter', '#Firebase', '#MobileApp'].map((tag) => ListTile(leading: Container(width: 4, height: 40, color: const Color(AppColors.primary), margin: const EdgeInsets.symmetric(vertical: 4)), title: Text(tag, style: const TextStyle(fontWeight: FontWeight.bold)), subtitle: Text('${(index + 1) * 1200} posts'), trailing: const Icon(Icons.more_horiz, size: 18))).toList());
      case 2:
        final searchAsync = ref.watch(userSearchProvider);
        return searchAsync.when(data: (users) => users.isEmpty ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.people_outline, size: 64, color: Colors.grey[400]), const SizedBox(height: 16), Text('Search for people', style: TextStyle(color: Colors.grey[500]))])) : ListView.builder(itemCount: users.length, itemBuilder: (context, index) => UserCard(user: users[index])), loading: () => const LoadingWidget(), error: (e, _) => const SizedBox());
      default:
        return const SizedBox();
    }
  }
}
