import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/date_utils.dart';
import '../../../providers/reports/reports_provider.dart';
import '../../widgets/common/admin_drawer.dart';
import '../../widgets/loading/loading_widget.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  String _statusFilter = 'all';

  @override
  Widget build(BuildContext context) {
    final reportsAsync = ref.watch(reportsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.reports),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(reportsProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AdminDrawer(),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppDimens.paddingMedium),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip(AppStrings.allStatus, 'all'),
                  const SizedBox(width: 8),
                  _buildFilterChip(AppStrings.pendingStatus, 'pending'),
                  const SizedBox(width: 8),
                  _buildFilterChip(AppStrings.resolvedStatus, 'resolved'),
                  const SizedBox(width: 8),
                  _buildFilterChip(AppStrings.rejectedStatus, 'rejected'),
                ],
              ),
            ),
          ),
          Expanded(
            child: reportsAsync.when(
              data: (reports) {
                if (reports.isEmpty) {
                  return const Center(child: Text(AppStrings.noReports));
                }
                return RefreshIndicator(
                  onRefresh: () => ref.read(reportsProvider.notifier).refresh(),
                  child: ListView.builder(
                    itemCount: reports.length,
                    padding: const EdgeInsets.all(AppDimens.paddingMedium),
                    itemBuilder: (context, index) {
                      final report = reports[index];
                      return _buildReportCard(context, ref, report);
                    },
                  ),
                );
              },
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
                      onPressed: () => ref.read(reportsProvider.notifier).refresh(),
                      child: const Text(AppStrings.tryAgain),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _statusFilter == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _statusFilter = value;
        });
        ref.read(reportsProvider.notifier).filterByStatus(value);
      },
    );
  }

  Widget _buildReportCard(BuildContext context, WidgetRef ref, dynamic report) {
    Color statusColor;
    switch (report.status) {
      case 'pending':
        statusColor = const Color(AppColors.warning);
        break;
      case 'resolved':
        statusColor = const Color(AppColors.success);
        break;
      case 'rejected':
        statusColor = const Color(AppColors.error);
        break;
      default:
        statusColor = Colors.grey;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.paddingMedium),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    report.status.toUpperCase(),
                    style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    report.targetType.toUpperCase(),
                    style: TextStyle(
                      color: Theme.of(context).primaryColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  AppDateUtils.formatRelativeTime(report.createdAt),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              report.reason,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (report.description.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                report.description,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            const SizedBox(height: 8),
            Text(
              'Reported by: ${report.reporterName}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Text(
              'Reported user: ${report.reportedUserName}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (report.status == 'pending') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text(AppStrings.confirmAction),
                            content: const Text(AppStrings.rejectConfirm),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text(AppStrings.cancel),
                              ),
                              TextButton(
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  ref.read(reportActionsProvider.notifier).rejectReport(report.id);
                                },
                                child: const Text(AppStrings.reject),
                              ),
                            ],
                          ),
                        );
                      },
                      icon: const Icon(Icons.close, size: 16),
                      label: const Text(AppStrings.reject),
                      style: OutlinedButton.styleFrom(foregroundColor: const Color(AppColors.warning)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text(AppStrings.confirmAction),
                            content: const Text(AppStrings.resolveConfirm),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text(AppStrings.cancel),
                              ),
                              TextButton(
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  ref.read(reportActionsProvider.notifier).resolveReport(report.id);
                                },
                                child: const Text(AppStrings.resolve),
                              ),
                            ],
                          ),
                        );
                      },
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text(AppStrings.resolve),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}