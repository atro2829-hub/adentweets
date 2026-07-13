import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/services/user_service.dart';
import '../../data/services/post_service.dart';
import '../../data/services/report_service.dart';

class AnalyticsData {
  final int totalUsers;
  final int totalPosts;
  final int pendingReports;
  final int activeToday;

  AnalyticsData({
    this.totalUsers = 0,
    this.totalPosts = 0,
    this.pendingReports = 0,
    this.activeToday = 0,
  });
}

final analyticsProvider = StateNotifierProvider<AnalyticsNotifier, AsyncValue<AnalyticsData>>((ref) {
  return AnalyticsNotifier();
});

class AnalyticsNotifier extends StateNotifier<AsyncValue<AnalyticsData>> {
  AnalyticsNotifier() : super(const AsyncValue.loading()) {
    _loadAnalytics();
  }

  Future<void> _loadAnalytics() async {
    try {
      final userService = UserService('admin');
      final postService = PostService();
      final reportService = ReportService();

      final results = await Future.wait([
        userService.getUserCount(),
        postService.getPostCount(),
        reportService.getPendingReportCount(),
        userService.getActiveTodayCount(),
      ]);

      state = AsyncValue.data(AnalyticsData(
        totalUsers: results[0] as int,
        totalPosts: results[1] as int,
        pendingReports: results[2] as int,
        activeToday: results[3] as int,
      ));
    } catch (e, st) {
      debugPrint('Error loading analytics: $e');
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _loadAnalytics();
  }
}