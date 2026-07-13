class ConversationModel {
  final String id;
  final List<String> participants;
  final Map<String, String> participantNames;
  final Map<String, String?> participantImages;
  final String lastMessage;
  final DateTime lastMessageTimestamp;
  final int unreadCount;

  ConversationModel({
    required this.id,
    this.participants = const [],
    this.participantNames = const {},
    this.participantImages = const {},
    this.lastMessage = '',
    DateTime? lastMessageTimestamp,
    this.unreadCount = 0,
  }) : lastMessageTimestamp = lastMessageTimestamp ?? DateTime.now();

  factory ConversationModel.fromMap(Map<String, dynamic> map, String id) {
    return ConversationModel(
      id: id,
      participants: List<String>.from(map['participants'] ?? []),
      participantNames: Map<String, String>.from(map['participantNames'] ?? {}),
      participantImages: Map<String, String?>.from(map['participantImages'] ?? {}),
      lastMessage: map['lastMessage'] ?? '',
      lastMessageTimestamp: map['lastMessageTimestamp'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['lastMessageTimestamp'])
          : DateTime.now(),
      unreadCount: map['unreadCount'] ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'participants': participants,
      'participantNames': participantNames,
      'participantImages': participantImages,
      'lastMessage': lastMessage,
      'lastMessageTimestamp': lastMessageTimestamp.millisecondsSinceEpoch,
      'unreadCount': unreadCount,
    };
  }
}
