import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/string_utils.dart';
import '../../../core/utils/date_utils.dart';
import '../../../providers/analytics/analytics_provider.dart';
import '../../../providers/posts/posts_provider.dart';
import '../../widgets/common/admin_drawer.dart';
import '../../widgets/common/stats_card.dart';
import '../../widgets/loading/loading_widget.dart';
import '../../widgets/image/avatar_widget.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(analyticsProvider);
    final postsAsync = ref.watch(allPostsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.dashboard),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(analyticsProvider.notifier).refresh();
              ref.read(allPostsProvider.notifier).refresh();
            },
          ),
        ],
      ),
      drawer: const AdminDrawer(),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.read(analyticsProvider.notifier).refresh();
          ref.read(allPostsProvider.notifier).refresh();
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimens.paddingMedium),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              analyticsAsync.when(
                data: (analytics) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Overview',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.8,
                      children: [
                        StatsCard(
                          title: AppStrings.totalUsers,
                          value: analytics.totalUsers,
                          icon: Icons.people,
                          color: const Color(AppColors.primary),
                        ),
                        StatsCard(
                          title: AppStrings.totalPosts,
                          value: analytics.totalPosts,
                          icon: Icons.post_add,
                          color: const Color(AppColors.success),
                        ),
                        StatsCard(
                          title: AppStrings.pendingReports,
                          value: analytics.pendingReports,
                          icon: Icons.flag,
                          color: const Color(AppColors.warning),
                        ),
                        StatsCard(
                          title: AppStrings.activeToday,
                          value: analytics.activeToday,
                          icon: Icons.trending_up,
                          color: const Color(AppColors.info),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      AppStrings.userGrowth,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildUserGrowthChart(analytics.totalUsers),
                  ],
                ),
                loading: () => const LoadingWidget(message: AppStrings.loading),
                error: (e, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error, color: Colors.red, size: 48),
                      const SizedBox(height: 16),
                      Text(AppStrings.error),
                      const SizedBox(height: 8),
                      ElevatedButton(
                        onPressed: () => ref.read(analyticsProvider.notifier).refresh(),
                        child: const Text(AppStrings.tryAgain),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                AppStrings.recentActivity,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              postsAsync.when(
                data: (posts) {
                  if (posts.isEmpty) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Text(AppStrings.noPosts),
                      ),
                    );
                  }
                  final recentPosts = posts.take(5).toList();
                  return Card(
                    child: Column(
                      children: recentPosts.map((post) {
                        return ListTile(
                          leading: AvatarWidget(
                            base64Image: post.userProfileImage,
                            name: post.username,
                            size: AppDimens.avatarMedium,
                          ),
                          title: Text(
                            '@${post.username}',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          subtitle: Text(
                            StringUtils.truncateText(post.content, 60),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: Text(
                            AppDateUtils.formatRelativeTime(post.createdAt),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        );
                      }).toList(),
                    ),
                  );
                },
                loading: () => const LoadingWidget(),
                error: (e, _) => const Text(AppStrings.error),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUserGrowthChart(int totalUsers) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.paddingMedium),
        child: SizedBox(
          height: 200,
          child: LineChart(
            LineChartData(
              gridData: FlGridData(show: true),
              titlesData: FlTitlesData(
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                      if (value.toInt() >= 0 && value.toInt() < months.length) {
                        return Text(months[value.toInt()], style: const TextStyle(fontSize: 10));
                      }
                      return const Text('');
                    },
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                topTitles: AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                rightTitles: AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [
                LineChartBarData(
                  isCurved: true,
                  color: const Color(AppColors.primary),
                  barWidth: 3,
                  dotData: FlDotData(show: true),
                  spots: _generateSpots(totalUsers),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<FlSpot> _generateSpots(int totalUsers) {
    if (totalUsers == 0) {
      return const [
        FlSpot(0, 0),
        FlSpot(1, 0),
        FlSpot(2, 0),
        FlSpot(3, 0),
        FlSpot(4, 0),
        FlSpot(5, 0),
      ];
    }
    final base = totalUsers / 6;
    return [
      FlSpot(0, base * 0.3),
      FlSpot(1, base * 0.7),
      FlSpot(2, base * 1.2),
      FlSpot(3, base * 1.8),
      FlSpot(4, base * 2.5),
      FlSpot(5, totalUsers.toDouble()),
    ];
  }
}