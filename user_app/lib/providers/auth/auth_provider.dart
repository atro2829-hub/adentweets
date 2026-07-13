import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../data/services/auth_service.dart';
import '../../data/services/user_service.dart';
import '../../data/models/user_model.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

final authStateProvider = StreamProvider<User?>((ref) {
  return ref.watch(authServiceProvider).authStateChanges;
});

final currentUserProvider = StateNotifierProvider<CurrentUserNotifier, UserModel?>((ref) {
  return CurrentUserNotifier();
});

class CurrentUserNotifier extends StateNotifier<UserModel?> {
  final AuthService _authService = AuthService();
  UserService? _userService;

  CurrentUserNotifier() : super(null) {
    _init();
  }

  void _init() {
    final userId = _authService.getCurrentUserId();
    if (userId != null) {
      _userService = UserService(userId);
      _loadUser(userId);
    }
  }

  Future<void> _loadUser(String userId) async {
    try {
      final user = await _userService!.getUser(userId);
      state = user;
    } catch (e) {
      debugPrint('Error loading user: $e');
    }
  }

  void setUser(UserModel user) {
    state = user;
  }

  void updateUser(Map<String, dynamic> data) {
    if (state != null) {
      state = state!.copyWith(
        fullName: data['fullName'] as String?,
        username: data['username'] as String?,
        bio: data['bio'] as String?,
        profileImage: data['profileImage'] as String?,
        bannerImage: data['bannerImage'] as String?,
      );
    }
  }

  void clearUser() {
    state = null;
  }

  void refreshUser() {
    final userId = _authService.getCurrentUserId();
    if (userId != null) _loadUser(userId);
  }
}

final loginProvider = StateNotifierProvider<LoginNotifier, AsyncValue<void>>((ref) {
  return LoginNotifier(ref);
});

class LoginNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  LoginNotifier(this._ref) : super(const AsyncData(null));

  Future<void> login({required String email, required String password}) async {
    state = const AsyncLoading();
    try {
      await _ref.read(authServiceProvider).signIn(email: email, password: password);
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }

  Future<void> loginWithGoogle() async {
    state = const AsyncLoading();
    try {
      await _ref.read(authServiceProvider).signInWithGoogle();
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }
}

final signupProvider = StateNotifierProvider<SignupNotifier, AsyncValue<void>>((ref) {
  return SignupNotifier(ref);
});

class SignupNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  SignupNotifier(this._ref) : super(const AsyncData(null));

  Future<void> signup({
    required String email,
    required String password,
    required String username,
    required String fullName,
  }) async {
    state = const AsyncLoading();
    try {
      final credential = await _ref.read(authServiceProvider).signUp(email: email, password: password);
      final userId = credential.user!.uid;
      final user = UserModel(
        id: userId,
        email: email,
        username: username,
        fullName: fullName,
      );
      final userService = UserService(userId);
      await userService.createUser(user);
      _ref.read(currentUserProvider.notifier).setUser(user);
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }
}

final logoutProvider = StateNotifierProvider<LogoutNotifier, AsyncValue<void>>((ref) {
  return LogoutNotifier(ref);
});

class LogoutNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  LogoutNotifier(this._ref) : super(const AsyncData(null));

  Future<void> logout() async {
    state = const AsyncLoading();
    try {
      await _ref.read(authServiceProvider).signOut();
      _ref.read(currentUserProvider.notifier).clearUser();
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }
}

final passwordResetProvider = StateNotifierProvider<PasswordResetNotifier, AsyncValue<void>>((ref) {
  return PasswordResetNotifier(ref);
});

class PasswordResetNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  PasswordResetNotifier(this._ref) : super(const AsyncData(null));

  Future<void> resetPassword(String email) async {
    state = const AsyncLoading();
    try {
      await _ref.read(authServiceProvider).resetPassword(email);
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }
}
