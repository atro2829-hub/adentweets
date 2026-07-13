import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/post_model.dart';
import '../../data/services/post_service.dart';
import '../auth/auth_provider.dart';

final postServiceProvider = Provider<PostService>((ref) => PostService());

final feedPostsProvider = StreamProvider<List<PostModel>>((ref) {
  final user = ref.watch(currentUserProvider);
  if (user == null) return Stream.value([]);
  return ref.read(postServiceProvider).fetchFeedPosts(user.id);
});

final userPostsProvider = StreamProvider.family<List<PostModel>, String>((ref, userId) {
  return ref.read(postServiceProvider).fetchUserPosts(userId);
});

final trendingPostsProvider = StreamProvider<List<PostModel>>((ref) {
  return ref.read(postServiceProvider).fetchTrendingPosts();
});

final postCreationProvider = StateNotifierProvider<PostCreationNotifier, AsyncValue<String?>>((ref) {
  return PostCreationNotifier(ref);
});

class PostCreationNotifier extends StateNotifier<AsyncValue<String?>> {
  final Ref _ref;
  PostCreationNotifier(this._ref) : super(const AsyncData(null));

  Future<void> createPost({
    required String content,
    String? image,
  }) async {
    state = const AsyncLoading();
    try {
      final user = _ref.read(currentUserProvider);
      if (user == null) throw Exception('Not authenticated');
      final postId = await _ref.read(postServiceProvider).createPost(
            userId: user.id,
            username: user.username,
            userFullName: user.fullName,
            userProfileImage: user.profileImage,
            content: content,
            image: image,
          );
      state = AsyncData(postId);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }

  void reset() {
    state = const AsyncData(null);
  }
}

final postLikeProvider = StateNotifierProvider<PostLikeNotifier, AsyncValue<void>>((ref) {
  return PostLikeNotifier(ref);
});

class PostLikeNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  PostLikeNotifier(this._ref) : super(const AsyncData(null));

  Future<void> toggleLike(String postId) async {
    try {
      final user = _ref.read(currentUserProvider);
      if (user == null) return;
      final service = _ref.read(postServiceProvider);
      final isLiked = await service.isPostLiked(postId, user.id);
      if (isLiked) {
        await service.unlikePost(postId, user.id);
      } else {
        await service.likePost(postId, user.id);
      }
    } catch (e) {
      debugPrint('Error toggling like: $e');
    }
  }
}
