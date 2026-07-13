import 'package:firebase_database/firebase_database.dart';
import '../models/report_model.dart';
import '../../core/constants/app_constants.dart';

class ReportService {
  final DatabaseReference _dbRef = FirebaseDatabase.instance.ref();

  Future<String> createReport({
    required String reporterId,
    required String reporterName,
    required String reportedUserId,
    required String reportedUserName,
    required String targetId,
    required String targetType,
    required String reason,
    String description = '',
  }) async {
    final reportRef = _dbRef.child(FirebasePaths.reports).push();
    final report = ReportModel(
      id: reportRef.key!,
      reporterId: reporterId,
      reporterName: reporterName,
      reportedUserId: reportedUserId,
      reportedUserName: reportedUserName,
      targetId: targetId,
      targetType: targetType,
      reason: reason,
      description: description,
    );
    await reportRef.set(report.toMap());
    return reportRef.key!;
  }

  Future<List<ReportModel>> getAllReports() async {
    final snapshot = await _dbRef.child(FirebasePaths.reports).get();
    final reports = <ReportModel>[];
    if (snapshot.exists) {
      final data = Map<String, dynamic>.from(snapshot.value as Map);
      data.forEach((key, value) {
        reports.add(ReportModel.fromMap(Map<String, dynamic>.from(value), key));
      });
    }
    reports.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return reports;
  }

  Future<List<ReportModel>> getReportsByStatus(String status) async {
    final snapshot = await _dbRef.child(FirebasePaths.reports)
        .orderByChild('status')
        .equalTo(status)
        .get();
    final reports = <ReportModel>[];
    if (snapshot.exists) {
      final data = Map<String, dynamic>.from(snapshot.value as Map);
      data.forEach((key, value) {
        reports.add(ReportModel.fromMap(Map<String, dynamic>.from(value), key));
      });
    }
    reports.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return reports;
  }

  Future<ReportModel?> getReportById(String reportId) async {
    final snapshot = await _dbRef.child(FirebasePaths.reports).child(reportId).get();
    if (!snapshot.exists) return null;
    return ReportModel.fromMap(Map<String, dynamic>.from(snapshot.value as Map), reportId);
  }

  Future<void> resolveReport(String reportId) async {
    await _dbRef.child(FirebasePaths.reports).child(reportId).child('status').set('resolved');
  }

  Future<void> rejectReport(String reportId) async {
    await _dbRef.child(FirebasePaths.reports).child(reportId).child('status').set('rejected');
  }

  Future<int> getPendingReportCount() async {
    final snapshot = await _dbRef.child(FirebasePaths.reports)
        .orderByChild('status')
        .equalTo('pending')
        .get();
    if (!snapshot.exists) return 0;
    return (snapshot.value as Map).length;
  }
}