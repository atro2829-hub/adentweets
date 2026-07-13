import 'package:firebase_database/firebase_database.dart';
import '../models/user_model.dart';
import '../../core/constants/app_constants.dart';

class UserService {
  final DatabaseReference _dbRef = FirebaseDatabase.instance.ref();
  final String currentUserId;

  UserService(this.currentUserId);

  Future<void> createUser(UserModel user) async {
    await _dbRef.child(FirebasePaths.users).child(user.id).set(user.toMap());
  }

  Future<UserModel?> getUser(String userId) async {
    final snapshot = await _dbRef.child(FirebasePaths.users).child(userId).get();
    if (!snapshot.exists) return null;
    return UserModel.fromMap(Map<String, dynamic>.from(snapshot.value as Map), userId);
  }

  Future<void> updateUser(String userId, Map<String, dynamic> data) async {
    await _dbRef.child(FirebasePaths.users).child(userId).update(data);
  }

  Future<void> deleteUser(String userId) async {
    await _dbRef.child(FirebasePaths.users).child(userId).remove();
  }

  Future<List<UserModel>> searchUsers(String query) async {
    final snapshot = await _dbRef.child(FirebasePaths.users)
        .orderByChild('username')
        .startAt(query)
        .endAt('$query\uf8ff')
        .limitToFirst(20)
        .get();
    final users = <UserModel>[];
    if (snapshot.exists) {
      final data = Map<String, dynamic>.from(snapshot.value as Map);
      data.forEach((key, value) {
        users.add(UserModel.fromMap(Map<String, dynamic>.from(value), key));
      });
    }
    return users;
  }

  Future<List<UserModel>> getAllUsers() async {
    final snapshot = await _dbRef.child(FirebasePaths.users).get();
    final users = <UserModel>[];
    if (snapshot.exists) {
      final data = Map<String, dynamic>.from(snapshot.value as Map);
      data.forEach((key, value) {
        users.add(UserModel.fromMap(Map<String, dynamic>.from(value), key));
      });
    }
    users.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return users;
  }

  Future<void> suspendUser(String userId) async {
    await _dbRef.child(FirebasePaths.users).child(userId).child('status').set('suspended');
  }

  Future<void> banUser(String userId) async {
    await _dbRef.child(FirebasePaths.users).child(userId).child('status').set('banned');
  }

  Future<void> activateUser(String userId) async {
    await _dbRef.child(FirebasePaths.users).child(userId).child('status').set('active');
  }

  Future<int> getUserCount() async {
    final snapshot = await _dbRef.child(FirebasePaths.users).get();
    if (!snapshot.exists) return 0;
    return (snapshot.value as Map).length;
  }

  Future<int> getActiveTodayCount() async {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day).millisecondsSinceEpoch;
    final snapshot = await _dbRef.child(FirebasePaths.users)
        .orderByChild('createdAt')
        .startAt(startOfDay)
        .get();
    if (!snapshot.exists) return 0;
    return (snapshot.value as Map).length;
  }

  Future<void> followUser(String targetUserId) async {
    await _dbRef.child(FirebasePaths.follows)
        .child(currentUserId)
        .child('following')
        .child(targetUserId)
        .set({'followedAt': DateTime.now().millisecondsSinceEpoch});
    await _dbRef.child(FirebasePaths.follows)
        .child(targetUserId)
        .child('followers')
        .child(currentUserId)
        .set({'followedAt': DateTime.now().millisecondsSinceEpoch});
    await _dbRef.child(FirebasePaths.users).child(targetUserId).child('followersCount')
        .set(ServerValue.increment(1));
    await _dbRef.child(FirebasePaths.users).child(currentUserId).child('followingCount')
        .set(ServerValue.increment(1));
  }

  Future<void> unfollowUser(String targetUserId) async {
    await _dbRef.child(FirebasePaths.follows)
        .child(currentUserId)
        .child('following')
        .child(targetUserId)
        .remove();
    await _dbRef.child(FirebasePaths.follows)
        .child(targetUserId)
        .child('followers')
        .child(currentUserId)
        .remove();
    await _dbRef.child(FirebasePaths.users).child(targetUserId).child('followersCount')
        .set(ServerValue.increment(-1));
    await _dbRef.child(FirebasePaths.users).child(currentUserId).child('followingCount')
        .set(ServerValue.increment(-1));
  }

  Future<bool> isFollowing(String targetUserId) async {
    final snapshot = await _dbRef.child(FirebasePaths.follows)
        .child(currentUserId)
        .child('following')
        .child(targetUserId)
        .get();
    return snapshot.exists;
  }

  Stream<List<UserModel>> getFollowers(String userId) {
    return _dbRef.child(FirebasePaths.follows).child(userId).child('followers').onValue.map((event) {
      final users = <UserModel>[];
      if (event.snapshot.exists) {
        final data = Map<String, dynamic>.from(event.snapshot.value as Map);
        final futures = data.keys.map((key) => getUser(key));
        return Future.wait(futures).then((list) => list.whereType<UserModel>().toList());
      }
      return users;
    }).asyncExpand((f) => Stream.value(f));
  }

  Stream<List<UserModel>> getFollowing(String userId) {
    return _dbRef.child(FirebasePaths.follows).child(userId).child('following').onValue.map((event) {
      final users = <UserModel>[];
      if (event.snapshot.exists) {
        final data = Map<String, dynamic>.from(event.snapshot.value as Map);
        final futures = data.keys.map((key) => getUser(key));
        return Future.wait(futures).then((list) => list.whereType<UserModel>().toList());
      }
      return users;
    }).asyncExpand((f) => Stream.value(f));
  }
}