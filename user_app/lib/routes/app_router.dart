import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/constants/app_constants.dart';
import '../presentation/screens/auth/splash_screen.dart';
import '../presentation/screens/auth/login_screen.dart';
import '../presentation/screens/auth/signup_screen.dart';
import '../presentation/screens/auth/forgot_password_screen.dart';
import '../presentation/screens/auth/email_verification_screen.dart';
import '../presentation/screens/home/home_screen.dart';
import '../presentation/screens/explore/explore_screen.dart';
import '../presentation/screens/notifications/notifications_screen.dart';
import '../presentation/screens/messages/messages_screen.dart';
import '../presentation/screens/post/create_post_screen.dart';
import '../presentation/screens/post/post_details_screen.dart';
import '../presentation/screens/profile/profile_screen.dart';
import '../presentation/screens/profile/edit_profile_screen.dart';
import '../presentation/screens/settings/settings_screen.dart';
import '../providers/auth/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: RouteNames.splash,
    redirect: (context, state) {
      final isAuthRoute = [RouteNames.login, RouteNames.signup, RouteNames.forgotPassword, RouteNames.splash].contains(state.matchedLocation);
      final isAuthenticated = authState.valueOrNull != null;
      if (!isAuthenticated && !isAuthRoute && state.matchedLocation != RouteNames.splash) return RouteNames.login;
      if (isAuthenticated && isAuthRoute && state.matchedLocation != RouteNames.splash) return RouteNames.home;
      return null;
    },
    routes: [
      GoRoute(path: RouteNames.splash, builder: (context, state) => const SplashScreen()),
      GoRoute(path: RouteNames.login, builder: (context, state) => const LoginScreen()),
      GoRoute(path: RouteNames.signup, builder: (context, state) => const SignupScreen()),
      GoRoute(path: RouteNames.forgotPassword, builder: (context, state) => const ForgotPasswordScreen()),
      GoRoute(path: RouteNames.emailVerification, builder: (context, state) => const EmailVerificationScreen()),
      ShellRoute(
        builder: (context, state, child) => _MainShell(child: child),
        routes: [
          GoRoute(path: RouteNames.home, builder: (context, state) => const HomeScreen()),
          GoRoute(path: '/explore', builder: (context, state) => const ExploreScreen()),
          GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
          GoRoute(path: '/messages', builder: (context, state) => const MessagesScreen()),
          GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
          GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
          GoRoute(path: '/create-post', builder: (context, state) => const CreatePostScreen()),
          GoRoute(path: '/edit-profile', builder: (context, state) => const EditProfileScreen()),
          GoRoute(path: '/post/:postId', builder: (context, state) => PostDetailsScreen(postId: state.pathParameters['postId']!)),
          GoRoute(path: '/user/:userId', builder: (context, state) => ProfileScreen(userId: state.pathParameters['userId'])),
        ],
      ),
    ],
  );
});

class _MainShell extends StatefulWidget {
  final Widget child;
  const _MainShell({required this.child});

  @override
  State<_MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<_MainShell> {
  int _currentIndex = 0;

  void _onTap(int index) {
    setState(() => _currentIndex = index);
    switch (index) {
      case 0: context.go(RouteNames.home); break;
      case 1: context.go('/explore'); break;
      case 2: context.go('/notifications'); break;
      case 3: context.go('/messages'); break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onTap,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(AppColors.primary),
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: AppStrings.home),
          BottomNavigationBarItem(icon: Icon(Icons.search), label: AppStrings.explore),
          BottomNavigationBarItem(icon: Icon(Icons.notifications_none_outlined), label: AppStrings.notifications),
          BottomNavigationBarItem(icon: Icon(Icons.mail_outline_outlined), label: AppStrings.messages),
        ],
      ),
    );
  }
}
