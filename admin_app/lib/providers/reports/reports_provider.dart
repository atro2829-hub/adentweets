import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/services/report_service.dart';
import '../../data/models/report_model.dart';

final reportServiceProvider = Provider<ReportService>((ref) => ReportService());

final reportsProvider = StateNotifierProvider<ReportsNotifier, AsyncValue<List<ReportModel>>>((ref) {
  return ReportsNotifier(ref);
});

class ReportsNotifier extends StateNotifier<AsyncValue<List<ReportModel>>> {
  final Ref _ref;
  ReportsNotifier(this._ref) : super(const AsyncValue.loading()) {
    _loadReports();
  }

  Future<void> _loadReports() async {
    try {
      final service = ReportService();
      final reports = await service.getAllReports();
      state = AsyncValue.data(reports);
    } catch (e, st) {
      debugPrint('Error loading reports: $e');
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> filterByStatus(String status) async {
    try {
      final service = ReportService();
      if (status == 'all') {
        final reports = await service.getAllReports();
        state = AsyncValue.data(reports);
      } else {
        final reports = await service.getReportsByStatus(status);
        state = AsyncValue.data(reports);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    await _loadReports();
  }
}

final reportActionsProvider = StateNotifierProvider<ReportActionsNotifier, AsyncValue<void>>((ref) {
  return ReportActionsNotifier(ref);
});

class ReportActionsNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  ReportActionsNotifier(this._ref) : super(const AsyncData(null));

  Future<void> resolveReport(String reportId) async {
    state = const AsyncLoading();
    try {
      final service = ReportService();
      await service.resolveReport(reportId);
      await _ref.read(reportsProvider.notifier).refresh();
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }

  Future<void> rejectReport(String reportId) async {
    state = const AsyncLoading();
    try {
      final service = ReportService();
      await service.rejectReport(reportId);
      await _ref.read(reportsProvider.notifier).refresh();
      state = const AsyncData(null);
    } catch (e) {
      state = AsyncError(e.toString(), StackTrace.current);
    }
  }
}