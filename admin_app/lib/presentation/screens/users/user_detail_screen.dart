import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/string_utils.dart';
import '../../../core/utils/date_utils.dart';
import '../../../data/services/user_service.dart';
import '../../../data/services/post_service.dart';
import '../../../providers/auth/auth_provider.dart';
import '../../../data/models/user_model.dart';
import '../../../data/models/post_model.dart';
import '../../widgets/common/admin_drawer.dart';
import '../../widgets/loading/loading_widget.dart';
import '../../widgets/image/avatar_widget.dart';

class UserDetailScreen extends ConsumerStatefulWidget {
  final String userId;

  const UserDetailScreen({super.key, required this.userId});

  @override
  ConsumerState<UserDetailScreen> createState() => _UserDetailScreenState();
}

class _UserDetailScreenState extends ConsumerState<UserDetailScreen> {
  UserModel? _user;
  List<PostModel> _posts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final userId = ref.read(authServiceProvider).getCurrentUserId() ?? '';
      final userService = UserService(userId);
      final postService = PostService();

      final user = await userService.getUser(widget.userId);
      final posts = await postService.fetchUserPosts(widget.userId).first;

      if (mounted) {
        setState(() {
          _user = user;
          _posts = posts;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_user?.username ?? 'User Details'),
        actions: [
          if (_user != null)
            PopupMenuButton<String>(
              onSelected: (value) => _handleAction(value),
              itemBuilder: (context) => [
                if (_user!.status == 'active')
                  const PopupMenuItem(value: 'suspend', child: Text(AppStrings.suspend)),
                if (_user!.status == 'active')
                  const PopupMenuItem(value: 'ban', child: Text(AppStrings.ban)),
                if (_user!.status != 'active')
                  const PopupMenuItem(value: 'activate', child: Text('Activate')),
                const PopupMenuItem(value: 'delete', child: Text(AppStrings.delete, style: TextStyle(color: Colors.red))),
              ],
            ),
        ],
      ),
      drawer: const AdminDrawer(),
      body: _loading
          ? const LoadingWidget(message: AppStrings.loading)
          : _user == null
              ? const Center(child: Text('User not found'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(AppDimens.paddingMedium),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Column(
                          children: [
                            AvatarWidget(
                              base64Image: _user!.profileImage,
                              name: _user!.fullName,
                              size: AppDimens.avatarXLarge,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _user!.fullName,
                              style: Theme.of(context).textTheme.headlineMedium,
                            ),
                            Text(
                              '@${_user!.username}',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: _getStatusColor(_user!.status).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _user!.status.toUpperCase(),
                                style: TextStyle(
                                  color: _getStatusColor(_user!.status),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      _buildInfoCard(),
                      const SizedBox(height: 16),
                      _buildStatsCard(),
                      const SizedBox(height: 24),
                      Text(
                        'Posts (${_posts.length})',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 12),
                      if (_posts.isEmpty)
                        const Card(
                          child: Padding(
                            padding: EdgeInsets.all(32),
                            child: Center(child: Text(AppStrings.noPosts)),
                          ),
                        )
                      else
                        ..._posts.map((post) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  post.content,
                                  style: Theme.of(context).textTheme.bodyLarge,
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Text(
                                      AppDateUtils.formatRelativeTime(post.createdAt),
                                      style: Theme.of(context).textTheme.bodySmall,
                                    ),
                                    const Spacer(),
                                    Text('${post.likesCount} likes', style: Theme.of(context).textTheme.bodySmall),
                                    const SizedBox(width: 16),
                                    Text('${post.commentsCount} comments', style: Theme.of(context).textTheme.bodySmall),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        )),
                    ],
                  ),
                ),
    );
  }

  Widget _buildInfoCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.paddingMedium),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Information', style: Theme.of(context).textTheme.titleMedium),
            const Divider(),
            _buildInfoRow(Icons.email, 'Email', _user!.email),
            _buildInfoRow(Icons.person, 'Username', '@${_user!.username}'),
            _buildInfoRow(Icons.calendar_today, 'Joined', AppDateUtils.formatDate(_user!.createdAt)),
            if (_user!.bio.isNotEmpty) _buildInfoRow(Icons.info, 'Bio', _user!.bio),
            _buildInfoRow(Icons.verified, 'Verified', _user!.isVerified ? 'Yes' : 'No'),
            _buildInfoRow(Icons.lock, 'Private', _user!.isPrivate ? 'Yes' : 'No'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(AppColors.primary)),
          const SizedBox(width: 12),
          Text('$label: ', style: Theme.of(context).textTheme.bodyMedium),
          Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyLarge)),
        ],
      ),
    );
  }

  Widget _buildStatsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.paddingMedium),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildStatColumn('Followers', StringUtils.formatNumber(_user!.followersCount)),
            _buildStatColumn('Following', StringUtils.formatNumber(_user!.followingCount)),
            _buildStatColumn('Posts', StringUtils.formatNumber(_user!.postsCount)),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn(String label, String value) {
    return Column(
      children: [
        Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'suspended':
        return const Color(AppColors.suspended);
      case 'banned':
        return const Color(AppColors.banned);
      default:
        return const Color(AppColors.success);
    }
  }

  void _handleAction(String action) {
    String message = '';
    Future<void> Function() actionFn;

    switch (action) {
      case 'suspend':
        message = AppStrings.suspendConfirm;
        actionFn = () => _updateUserStatus('suspended');
        break;
      case 'ban':
        message = AppStrings.banConfirm;
        actionFn = () => _updateUserStatus('banned');
        break;
      case 'activate':
        message = 'This will reactivate the user.';
        actionFn = () => _updateUserStatus('active');
        break;
      case 'delete':
        message = AppStrings.deleteConfirm;
        actionFn = () async {
          final userId = ref.read(authServiceProvider).getCurrentUserId() ?? '';
          final service = UserService(userId);
          await service.deleteUser(widget.userId);
          if (mounted) context.go(RouteNames.users);
        };
        break;
      default:
        return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(AppStrings.confirmAction),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text(AppStrings.cancel)),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              actionFn();
            },
            child: const Text(AppStrings.save),
          ),
        ],
      ),
    );
  }

  Future<void> _updateUserStatus(String status) async {
    final userId = ref.read(authServiceProvider).getCurrentUserId() ?? '';
    final service = UserService(userId);
    await service.updateUser(widget.userId, {'status': status});
    _loadData();
  }
}