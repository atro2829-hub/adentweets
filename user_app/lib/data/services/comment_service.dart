import 'package:firebase_database/firebase_database.dart';
import '../models/comment_model.dart';
import '../../core/constants/app_constants.dart';

class CommentService {
  final DatabaseReference _dbRef = FirebaseDatabase.instance.ref();

  Future<String> createComment({
    required String postId,
    required String userId,
    required String username,
    required String userFullName,
    String? userProfileImage,
    required String content,
    String? image,
  }) async {
    final commentRef = _dbRef.child(FirebasePaths.comments).child(postId).push();
    final comment = CommentModel(
      id: commentRef.key!,
      postId: postId,
      userId: userId,
      username: username,
      userFullName: userFullName,
      userProfileImage: userProfileImage,
      content: content,
      image: image,
    );
    await commentRef.set(comment.toMap());
    await _dbRef.child(FirebasePaths.posts).child(postId).child('commentsCount')
        .set(ServerValue.increment(1));
    return commentRef.key!;
  }

  Stream<List<CommentModel>> fetchComments(String postId) {
    return _dbRef.child(FirebasePaths.comments).child(postId)
        .orderByChild('createdAt')
        .onValue
        .map((event) {
          final comments = <CommentModel>[];
          if (event.snapshot.exists) {
            final data = Map<String, dynamic>.from(event.snapshot.value as Map);
            data.forEach((key, value) {
              comments.add(CommentModel.fromMap(Map<String, dynamic>.from(value), key));
            });
            comments.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          }
          return comments;
        });
  }

  Future<void> deleteComment(String postId, String commentId) async {
    await _dbRef.child(FirebasePaths.comments).child(postId).child(commentId).remove();
    await _dbRef.child(FirebasePaths.posts).child(postId).child('commentsCount')
        .set(ServerValue.increment(-1));
  }

  Future<void> likeComment(String postId, String commentId, String userId) async {
    await _dbRef.child(FirebasePaths.comments).child(postId).child(commentId)
        .child('likes').child(userId).set(true);
  }

  Future<void> unlikeComment(String postId, String commentId, String userId) async {
    await _dbRef.child(FirebasePaths.comments).child(postId).child(commentId)
        .child('likes').child(userId).remove();
  }
}
