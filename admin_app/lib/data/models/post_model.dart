class PostModel {
  final String id;
  final String userId;
  final String username;
  final String userFullName;
  final String? userProfileImage;
  final String content;
  final String? image;
  final List<String> hashtags;
  final List<String> mentions;
  final int likesCount;
  final int commentsCount;
  final int retweetsCount;
  final bool isLiked;
  final bool isRetweeted;
  final bool isBookmarked;
  final DateTime createdAt;

  PostModel({
    required this.id,
    required this.userId,
    required this.username,
    this.userFullName = '',
    this.userProfileImage,
    this.content = '',
    this.image,
    this.hashtags = const [],
    this.mentions = const [],
    this.likesCount = 0,
    this.commentsCount = 0,
    this.retweetsCount = 0,
    this.isLiked = false,
    this.isRetweeted = false,
    this.isBookmarked = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory PostModel.fromMap(Map<String, dynamic> map, String id) {
    return PostModel(
      id: id,
      userId: map['userId'] ?? '',
      username: map['username'] ?? '',
      userFullName: map['userFullName'] ?? '',
      userProfileImage: map['userProfileImage'],
      content: map['content'] ?? '',
      image: map['image'],
      hashtags: List<String>.from(map['hashtags'] ?? []),
      mentions: List<String>.from(map['mentions'] ?? []),
      likesCount: map['likesCount'] ?? 0,
      commentsCount: map['commentsCount'] ?? 0,
      retweetsCount: map['retweetsCount'] ?? 0,
      isLiked: map['isLiked'] ?? false,
      isRetweeted: map['isRetweeted'] ?? false,
      isBookmarked: map['isBookmarked'] ?? false,
      createdAt: map['createdAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'username': username,
      'userFullName': userFullName,
      'userProfileImage': userProfileImage,
      'content': content,
      'image': image,
      'hashtags': hashtags,
      'mentions': mentions,
      'likesCount': likesCount,
      'commentsCount': commentsCount,
      'retweetsCount': retweetsCount,
      'createdAt': createdAt.millisecondsSinceEpoch,
    };
  }

  PostModel copyWith({
    String? content,
    String? image,
    int? likesCount,
    int? commentsCount,
    int? retweetsCount,
    bool? isLiked,
    bool? isRetweeted,
    bool? isBookmarked,
    List<String>? hashtags,
    List<String>? mentions,
  }) {
    return PostModel(
      id: id,
      userId: userId,
      username: username,
      userFullName: userFullName,
      userProfileImage: userProfileImage,
      content: content ?? this.content,
      image: image ?? this.image,
      hashtags: hashtags ?? this.hashtags,
      mentions: mentions ?? this.mentions,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      retweetsCount: retweetsCount ?? this.retweetsCount,
      isLiked: isLiked ?? this.isLiked,
      isRetweeted: isRetweeted ?? this.isRetweeted,
      isBookmarked: isBookmarked ?? this.isBookmarked,
      createdAt: createdAt,
    );
  }
}