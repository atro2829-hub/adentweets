class ReportModel {
  final String id;
  final String reporterId;
  final String reporterName;
  final String reportedUserId;
  final String reportedUserName;
  final String targetId;
  final String targetType; // 'post' or 'user'
  final String reason;
  final String description;
  final String status; // 'pending', 'resolved', 'rejected'
  final DateTime createdAt;

  ReportModel({
    required this.id,
    required this.reporterId,
    required this.reporterName,
    required this.reportedUserId,
    required this.reportedUserName,
    required this.targetId,
    required this.targetType,
    required this.reason,
    this.description = '',
    this.status = 'pending',
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory ReportModel.fromMap(Map<String, dynamic> map, String id) {
    return ReportModel(
      id: id,
      reporterId: map['reporterId'] ?? '',
      reporterName: map['reporterName'] ?? '',
      reportedUserId: map['reportedUserId'] ?? '',
      reportedUserName: map['reportedUserName'] ?? '',
      targetId: map['targetId'] ?? '',
      targetType: map['targetType'] ?? 'post',
      reason: map['reason'] ?? '',
      description: map['description'] ?? '',
      status: map['status'] ?? 'pending',
      createdAt: map['createdAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'reporterId': reporterId,
      'reporterName': reporterName,
      'reportedUserId': reportedUserId,
      'reportedUserName': reportedUserName,
      'targetId': targetId,
      'targetType': targetType,
      'reason': reason,
      'description': description,
      'status': status,
      'createdAt': createdAt.millisecondsSinceEpoch,
    };
  }

  ReportModel copyWith({
    String? reporterId,
    String? reporterName,
    String? reportedUserId,
    String? reportedUserName,
    String? targetId,
    String? targetType,
    String? reason,
    String? description,
    String? status,
  }) {
    return ReportModel(
      id: id,
      reporterId: reporterId ?? this.reporterId,
      reporterName: reporterName ?? this.reporterName,
      reportedUserId: reportedUserId ?? this.reportedUserId,
      reportedUserName: reportedUserName ?? this.reportedUserName,
      targetId: targetId ?? this.targetId,
      targetType: targetType ?? this.targetType,
      reason: reason ?? this.reason,
      description: description ?? this.description,
      status: status ?? this.status,
      createdAt: createdAt,
    );
  }
}