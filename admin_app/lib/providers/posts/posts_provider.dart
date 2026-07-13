import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/services/post_service.dart';
import '../../data/models/post_model.dart';
import '../../data/services/auth_service.dart';
import '../auth/auth_provider.dart';

final postServiceProvider = Provider<PostService>((ref) => PostService());

final allPostsProvider = StateNotifierProvider<AllPostsNotifier, AsyncValue<List<PostModel>>>((ref) {
  return AllPostsNotifier(ref);
});

class AllPostsNotifier extends StateNotifier<AsyncValue<List<PostModel>>> {
  final Ref _ref;
  AllPostsNotifier(this._ref) : super(const AsyncValue.loading()) {
    _loadPosts();
  }

  Future<void> _loadPosts() async {
    try {
      final service = PostService();
      final posts = await service.getAllPosts();
      state = AsyncValue.data(posts);
    } catch (e, st) {
      debugPrint('Error loading posts: $e');
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> deletePost(String postId, String userId) async {
    try {
      final service = PostService();
      await service.deletePost(postId, userId);
      await refresh();
    } catch (e) {
      debugPrint('Error deleting post: $e');
    }
  }

  Future<void> refresh() async {
    await _loadPosts();
  }
}

final postModerationProvider = StateNotifierProvider<PostModerationNotifier, AsyncValue<void>>((ref) {
  return PostModerationNotifier(ref);
});

class PostModerationNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  PostModerationNotifier(this._ref) : super(const AsyncData(null));

  Future<void> deletePostAdmin(String postId, String userId) async {
    state = const AsyncLoading();
    try {
      final service = PostService();
      await service.deletePost(postId, userId);
      await _ref.read(allPostsProvider.notifier).refresh();
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }
}