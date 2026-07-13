import 'package:firebase_database/firebase_database.dart';
import '../models/post_model.dart';
import '../../core/constants/app_constants.dart';

class PostService {
  final DatabaseReference _dbRef = FirebaseDatabase.instance.ref();

  Future<String> createPost({
    required String userId,
    required String username,
    required String userFullName,
    String? userProfileImage,
    required String content,
    String? image,
    List<String> hashtags = const [],
    List<String> mentions = const [],
  }) async {
    final postRef = _dbRef.child(FirebasePaths.posts).push();
    final post = PostModel(
      id: postRef.key!,
      userId: userId,
      username: username,
      userFullName: userFullName,
      userProfileImage: userProfileImage,
      content: content,
      image: image,
      hashtags: hashtags,
      mentions: mentions,
    );
    await postRef.set(post.toMap());
    // Add to feed
    await _dbRef.child(FirebasePaths.feeds).child(userId).child(postRef.key!).set(true);
    // Update user post count
    await _dbRef.child(FirebasePaths.users).child(userId).child('postsCount')
        .set(ServerValue.increment(1));
    return postRef.key!;
  }

  Stream<List<PostModel>> fetchFeedPosts(String userId) {
    return _dbRef.child(FirebasePaths.posts)
        .orderByChild('createdAt')
        .limitToLast(50)
        .onValue
        .map((event) {
          final posts = <PostModel>[];
          if (event.snapshot.exists) {
            final data = Map<String, dynamic>.from(event.snapshot.value as Map);
            data.forEach((key, value) {
              posts.add(PostModel.fromMap(Map<String, dynamic>.from(value), key));
            });
            posts.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          }
          return posts;
        });
  }

  Stream<List<PostModel>> fetchUserPosts(String userId) {
    return _dbRef.child(FirebasePaths.posts)
        .orderByChild('userId')
        .equalTo(userId)
        .onValue
        .map((event) {
          final posts = <PostModel>[];
          if (event.snapshot.exists) {
            final data = Map<String, dynamic>.from(event.snapshot.value as Map);
            data.forEach((key, value) {
              posts.add(PostModel.fromMap(Map<String, dynamic>.from(value), key));
            });
            posts.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          }
          return posts;
        });
  }

  Future<PostModel?> getPostById(String postId) async {
    final snapshot = await _dbRef.child(FirebasePaths.posts).child(postId).get();
    if (!snapshot.exists) return null;
    return PostModel.fromMap(Map<String, dynamic>.from(snapshot.value as Map), postId);
  }

  Future<void> deletePost(String postId, String userId) async {
    await _dbRef.child(FirebasePaths.posts).child(postId).remove();
    await _dbRef.child(FirebasePaths.feeds).child(userId).child(postId).remove();
    await _dbRef.child(FirebasePaths.users).child(userId).child('postsCount')
        .set(ServerValue.increment(-1));
  }

  Future<void> likePost(String postId, String userId) async {
    await _dbRef.child(FirebasePaths.likes).child(postId).child(userId).set({
      'likedAt': DateTime.now().millisecondsSinceEpoch,
    });
    await _dbRef.child(FirebasePaths.posts).child(postId).child('likesCount')
        .set(ServerValue.increment(1));
  }

  Future<void> unlikePost(String postId, String userId) async {
    await _dbRef.child(FirebasePaths.likes).child(postId).child(userId).remove();
    await _dbRef.child(FirebasePaths.posts).child(postId).child('likesCount')
        .set(ServerValue.increment(-1));
  }

  Future<void> bookmarkPost(String postId, String userId) async {
    await _dbRef.child(FirebasePaths.bookmarks).child(userId).child(postId).set(true);
  }

  Future<void> removeBookmark(String postId, String userId) async {
    await _dbRef.child(FirebasePaths.bookmarks).child(userId).child(postId).remove();
  }

  Future<bool> isPostLiked(String postId, String userId) async {
    final snapshot = await _dbRef.child(FirebasePaths.likes).child(postId).child(userId).get();
    return snapshot.exists;
  }

  Stream<List<PostModel>> fetchTrendingPosts() {
    return _dbRef.child(FirebasePaths.posts)
        .orderByChild('likesCount')
        .limitToLast(20)
        .onValue
        .map((event) {
          final posts = <PostModel>[];
          if (event.snapshot.exists) {
            final data = Map<String, dynamic>.from(event.snapshot.value as Map);
            data.forEach((key, value) {
              posts.add(PostModel.fromMap(Map<String, dynamic>.from(value), key));
            });
            posts.sort((a, b) => b.likesCount.compareTo(a.likesCount));
          }
          return posts;
        });
  }
}
