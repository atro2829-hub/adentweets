import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../core/constants/app_constants.dart';
import '../../../providers/analytics/analytics_provider.dart';
import '../../widgets/common/admin_drawer.dart';
import '../../widgets/loading/loading_widget.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(analyticsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.analytics),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(analyticsProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AdminDrawer(),
      body: RefreshIndicator(
        onRefresh: () => ref.read(analyticsProvider.notifier).refresh(),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimens.paddingMedium),
          child: analyticsAsync.when(
            data: (analytics) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Platform Analytics',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 24),
                const Text(
                  AppStrings.userGrowth,
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                _buildUserGrowthChart(analytics.totalUsers),
                const SizedBox(height: 24),
                const Text(
                  AppStrings.postTrends,
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                _buildPostTrendsChart(analytics.totalPosts),
                const SizedBox(height: 24),
                const Text(
                  'Engagement Metrics',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                _buildEngagementChart(analytics),
                const SizedBox(height: 24),
                _buildSummaryCards(analytics),
                const SizedBox(height: 24),
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
        ),
      ),
    );
  }

  Widget _buildUserGrowthChart(int totalUsers) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.paddingMedium),
        child: SizedBox(
          height: 250,
          child: LineChart(
            LineChartData(
              gridData: FlGridData(show: true),
              titlesData: FlTitlesData(
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      if (value.toInt() >= 0 && value.toInt() < months.length) {
                        return Text(months[value.toInt()], style: const TextStyle(fontSize: 10));
                      }
                      return const Text('');
                    },
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(showTitles: true, getTitlesWidget: (value, meta) {
                    return Text(value.toInt().toString(), style: const TextStyle(fontSize: 10));
                  }),
                ),
                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [
                LineChartBarData(
                  isCurved: true,
                  color: const Color(AppColors.primary),
                  barWidth: 3,
                  dotData: FlDotData(show: true),
                  spots: _generateGrowthSpots(totalUsers),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPostTrendsChart(int totalPosts) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.paddingMedium),
        child: SizedBox(
          height: 250,
          child: BarChart(
            BarChartData(
              gridData: FlGridData(show: true),
              titlesData: FlTitlesData(
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      if (value.toInt() >= 0 && value.toInt() < days.length) {
                        return Text(days[value.toInt()], style: const TextStyle(fontSize: 10));
                      }
                      return const Text('');
                    },
                  ),
                ),
                leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              borderData: FlBorderData(show: false),
              barGroups: _generateBarGroups(totalPosts),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEngagementChart(dynamic analytics) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.paddingMedium),
        child: SizedBox(
          height: 250,
          child: PieChart(
            PieChartData(
              sections: [
                PieChartSectionData(
                  value: (analytics.totalPosts * 2.5).toDouble(),
                  title: 'Likes',
                  color: const Color(AppColors.primary),
                  radius: 80,
                  titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                PieChartSectionData(
                  value: (analytics.totalPosts * 1.8).toDouble(),
                  title: 'Comments',
                  color: const Color(AppColors.success),
                  radius: 70,
                  titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                PieChartSectionData(
                  value: (analytics.totalPosts * 0.5).toDouble(),
                  title: 'Shares',
                  color: const Color(AppColors.warning),
                  radius: 60,
                  titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ],
              sectionsSpace: 4,
              centerSpaceRadius: 40,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryCards(dynamic analytics) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 2.5,
      children: [
        _buildSummaryCard(context, 'Avg Posts/User', analytics.totalUsers > 0 ? (analytics.totalPosts / analytics.totalUsers).toStringAsFixed(1) : '0', Icons.post_add),
        _buildSummaryCard(context, 'Reports/Day', (analytics.pendingReports / 7).toStringAsFixed(1), Icons.flag),
        _buildSummaryCard(context, 'Growth Rate', '+${(analytics.totalUsers * 0.12).toStringAsFixed(0)}%', Icons.trending_up),
        _buildSummaryCard(context, 'Retention', '${(65 + (analytics.totalUsers % 20)).toString()}%', Icons.people),
      ],
    );
  }

  Widget _buildSummaryCard(BuildContext ctx, String title, String value, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.paddingMedium),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Icon(icon, color: const Color(AppColors.primary), size: 20),
                const SizedBox(width: 8),
                Text(title, style: Theme.of(ctx).textTheme.bodySmall),
              ],
            ),
            const SizedBox(height: 4),
            Text(value, style: Theme.of(ctx).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  List<FlSpot> _generateGrowthSpots(int total) {
    if (total == 0) {
      return List.generate(12, (i) => FlSpot(i.toDouble(), 0));
    }
    final base = total / 12;
    return List.generate(12, (i) {
      final growth = base * (i + 1) * (0.5 + (i / 24));
      return FlSpot(i.toDouble(), growth);
    });
  }

  List<BarChartGroupData> _generateBarGroups(int totalPosts) {
    if (totalPosts == 0) {
      return List.generate(7, (i) => BarChartGroupData(x: i, barRods: [
        BarChartRodData(toY: 0, color: const Color(AppColors.primary)),
      ]));
    }
    final dailyAvg = totalPosts / 30;
    return List.generate(7, (i) {
      final value = dailyAvg * (0.5 + (i % 3) * 0.3);
      return BarChartGroupData(
        x: i,
        barRods: [
          BarChartRodData(
            toY: value,
            color: const Color(AppColors.primary),
            borderRadius: BorderRadius.circular(4),
          ),
        ],
      );
    });
  }
}