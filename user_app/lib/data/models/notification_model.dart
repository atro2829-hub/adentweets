class NotificationModel {
  final String id;
  final String userId;
  final String type;
  final String actorId;
  final String actorName;
  final String? actorImage;
  final String? postId;
  final String message;
  final bool isRead;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.userId,
    this.type = 'like',
    required this.actorId,
    this.actorName = '',
    this.actorImage,
    this.postId,
    this.message = '',
    this.isRead = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory NotificationModel.fromMap(Map<String, dynamic> map, String id) {
    return NotificationModel(
      id: id,
      userId: map['userId'] ?? '',
      type: map['type'] ?? 'like',
      actorId: map['actorId'] ?? '',
      actorName: map['actorName'] ?? '',
      actorImage: map['actorImage'],
      postId: map['postId'],
      message: map['message'] ?? '',
      isRead: map['isRead'] ?? false,
      createdAt: map['createdAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'type': type,
      'actorId': actorId,
      'actorName': actorName,
      'actorImage': actorImage,
      'postId': postId,
      'message': message,
      'isRead': isRead,
      'createdAt': createdAt.millisecondsSinceEpoch,
    };
  }
}
