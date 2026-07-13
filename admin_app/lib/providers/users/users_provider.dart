import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/services/user_service.dart';
import '../../data/models/user_model.dart';
import '../../data/services/auth_service.dart';
import '../auth/auth_provider.dart';

final userServiceProvider = Provider<UserService>((ref) {
  final userId = ref.watch(authServiceProvider).getCurrentUserId() ?? '';
  return UserService(userId);
});

final allUsersProvider = StateNotifierProvider<AllUsersNotifier, AsyncValue<List<UserModel>>>((ref) {
  return AllUsersNotifier(ref);
});

class AllUsersNotifier extends StateNotifier<AsyncValue<List<UserModel>>> {
  final Ref _ref;
  AllUsersNotifier(this._ref) : super(const AsyncValue.loading()) {
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    try {
      final userId = _ref.read(authServiceProvider).getCurrentUserId() ?? '';
      final service = UserService(userId);
      final users = await service.getAllUsers();
      state = AsyncValue.data(users);
    } catch (e, st) {
      debugPrint('Error loading users: $e');
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> searchUsers(String query) async {
    if (query.isEmpty) {
      await _loadUsers();
      return;
    }
    try {
      final userId = _ref.read(authServiceProvider).getCurrentUserId() ?? '';
      final service = UserService(userId);
      final users = await service.searchUsers(query);
      state = AsyncValue.data(users);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> filterByStatus(String status) async {
    try {
      final usersAsync = state;
      if (usersAsync is AsyncData<List<UserModel>>) {
        final users = usersAsync.value;
        if (status == 'all') {
          state = AsyncValue.data(users);
        } else {
          state = AsyncValue.data(
            users.where((u) => u.status == status).toList(),
          );
        }
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    await _loadUsers();
  }
}

final userSearchProvider = StateProvider<String>((ref) => '');

final userActionsProvider = StateNotifierProvider<UserActionsNotifier, AsyncValue<void>>((ref) {
  return UserActionsNotifier(ref);
});

class UserActionsNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  UserActionsNotifier(this._ref) : super(const AsyncData(null));

  Future<void> suspendUser(String userId) async {
    state = const AsyncLoading();
    try {
      final userId0 = _ref.read(authServiceProvider).getCurrentUserId() ?? '';
      final service = UserService(userId0);
      await service.suspendUser(userId);
      await _ref.read(allUsersProvider.notifier).refresh();
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }

  Future<void> banUser(String userId) async {
    state = const AsyncLoading();
    try {
      final userId0 = _ref.read(authServiceProvider).getCurrentUserId() ?? '';
      final service = UserService(userId0);
      await service.banUser(userId);
      await _ref.read(allUsersProvider.notifier).refresh();
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }

  Future<void> activateUser(String userId) async {
    state = const AsyncLoading();
    try {
      final userId0 = _ref.read(authServiceProvider).getCurrentUserId() ?? '';
      final service = UserService(userId0);
      await service.activateUser(userId);
      await _ref.read(allUsersProvider.notifier).refresh();
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }

  Future<void> deleteUser(String userId) async {
    state = const AsyncLoading();
    try {
      final userId0 = _ref.read(authServiceProvider).getCurrentUserId() ?? '';
      final service = UserService(userId0);
      await service.deleteUser(userId);
      await _ref.read(allUsersProvider.notifier).refresh();
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }
}