import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/constants/app_constants.dart';
import '../presentation/screens/auth/splash_screen.dart';
import '../presentation/screens/auth/login_screen.dart';
import '../presentation/screens/dashboard/dashboard_screen.dart';
import '../presentation/screens/users/users_screen.dart';
import '../presentation/screens/users/user_detail_screen.dart';
import '../presentation/screens/moderation/moderation_screen.dart';
import '../presentation/screens/reports/reports_screen.dart';
import '../presentation/screens/analytics/analytics_screen.dart';
import '../presentation/screens/settings/settings_screen.dart';
import '../providers/auth/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: RouteNames.splash,
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null;
      final isAuthRoute = state.matchedLocation == RouteNames.login ||
          state.matchedLocation == RouteNames.splash;

      if (!isLoggedIn && !isAuthRoute) {
        return RouteNames.login;
      }
      if (isLoggedIn && isAuthRoute && state.matchedLocation != RouteNames.splash) {
        return RouteNames.dashboard;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: RouteNames.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RouteNames.dashboard,
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: RouteNames.users,
        builder: (context, state) => const UsersScreen(),
      ),
      GoRoute(
        path: RouteNames.userDetail,
        builder: (context, state) {
          final userId = state.pathParameters['userId']!;
          return UserDetailScreen(userId: userId);
        },
      ),
      GoRoute(
        path: RouteNames.moderation,
        builder: (context, state) => const ModerationScreen(),
      ),
      GoRoute(
        path: RouteNames.reports,
        builder: (context, state) => const ReportsScreen(),
      ),
      GoRoute(
        path: RouteNames.analytics,
        builder: (context, state) => const AnalyticsScreen(),
      ),
      GoRoute(
        path: RouteNames.settings,
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
  );
});