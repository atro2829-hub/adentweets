import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/user_model.dart';
import '../../data/services/user_service.dart';
import '../auth/auth_provider.dart';

final userServiceProvider = Provider<UserService?>((ref) {
  final user = ref.watch(currentUserProvider);
  if (user == null) return null;
  return UserService(user.id);
});

final userProfileProvider = FutureProvider.family<UserModel?, String>((ref, userId) async {
  final service = ref.read(userServiceProvider);
  if (service == null) return null;
  return service.getUser(userId);
});

final userSearchProvider = StateNotifierProvider<UserSearchNotifier, AsyncValue<List<UserModel>>>((ref) {
  return UserSearchNotifier(ref);
});

class UserSearchNotifier extends StateNotifier<AsyncValue<List<UserModel>>> {
  final Ref _ref;
  UserSearchNotifier(this._ref) : super(const AsyncData([]));

  Future<void> search(String query) async {
    if (query.isEmpty) {
      state = const AsyncData([]);
      return;
    }
    state = const AsyncLoading();
    try {
      final service = _ref.read(userServiceProvider);
      if (service == null) {
        state = const AsyncData([]);
        return;
      }
      final users = await service.searchUsers(query);
      state = AsyncData(users);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }
}

final followProvider = StateNotifierProvider<FollowNotifier, AsyncValue<void>>((ref) {
  return FollowNotifier(ref);
});

class FollowNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  FollowNotifier(this._ref) : super(const AsyncData(null));

  Future<void> toggleFollow(String targetUserId) async {
    try {
      final service = _ref.read(userServiceProvider);
      if (service == null) return;
      final isFollowing = await service.isFollowing(targetUserId);
      if (isFollowing) {
        await service.unfollowUser(targetUserId);
      } else {
        await service.followUser(targetUserId);
      }
    } catch (e) {
      debugPrint('Error toggling follow: $e');
    }
  }

  Future<bool> checkFollowing(String targetUserId) async {
    final service = _ref.read(userServiceProvider);
    if (service == null) return false;
    return service.isFollowing(targetUserId);
  }
}
