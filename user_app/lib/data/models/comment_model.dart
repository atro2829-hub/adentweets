class CommentModel {
  final String id;
  final String postId;
  final String userId;
  final String username;
  final String userFullName;
  final String? userProfileImage;
  final String content;
  final String? image;
  final int likesCount;
  final bool isLiked;
  final DateTime createdAt;

  CommentModel({
    required this.id,
    required this.postId,
    required this.userId,
    required this.username,
    this.userFullName = '',
    this.userProfileImage,
    this.content = '',
    this.image,
    this.likesCount = 0,
    this.isLiked = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory CommentModel.fromMap(Map<String, dynamic> map, String id) {
    return CommentModel(
      id: id,
      postId: map['postId'] ?? '',
      userId: map['userId'] ?? '',
      username: map['username'] ?? '',
      userFullName: map['userFullName'] ?? '',
      userProfileImage: map['userProfileImage'],
      content: map['content'] ?? '',
      image: map['image'],
      likesCount: map['likesCount'] ?? 0,
      isLiked: map['isLiked'] ?? false,
      createdAt: map['createdAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'postId': postId,
      'userId': userId,
      'username': username,
      'userFullName': userFullName,
      'userProfileImage': userProfileImage,
      'content': content,
      'image': image,
      'likesCount': likesCount,
      'createdAt': createdAt.millisecondsSinceEpoch,
    };
  }

  CommentModel copyWith({
    String? content,
    String? image,
    int? likesCount,
    bool? isLiked,
  }) {
    return CommentModel(
      id: id,
      postId: postId,
      userId: userId,
      username: username,
      userFullName: userFullName,
      userProfileImage: userProfileImage,
      content: content ?? this.content,
      image: image ?? this.image,
      likesCount: likesCount ?? this.likesCount,
      isLiked: isLiked ?? this.isLiked,
      createdAt: createdAt,
    );
  }
}
