import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/string_utils.dart';
import '../../../core/utils/date_utils.dart';
import '../../../providers/users/users_provider.dart';
import '../../widgets/common/admin_drawer.dart';
import '../../widgets/loading/loading_widget.dart';
import '../../widgets/image/avatar_widget.dart';

class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});

  @override
  ConsumerState<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends ConsumerState<UsersScreen> {
  String _statusFilter = 'all';
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(allUsersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.users),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(allUsersProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AdminDrawer(),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppDimens.paddingMedium),
            child: Column(
              children: [
                TextField(
                  decoration: const InputDecoration(
                    hintText: AppStrings.search,
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (value) {
                    _searchQuery = value;
                    ref.read(allUsersProvider.notifier).searchUsers(value);
                  },
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip(AppStrings.allUsers, 'all'),
                      const SizedBox(width: 8),
                      _buildFilterChip(AppStrings.suspendedUsers, 'suspended'),
                      const SizedBox(width: 8),
                      _buildFilterChip(AppStrings.bannedUsers, 'banned'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: usersAsync.when(
              data: (users) {
                if (users.isEmpty) {
                  return const Center(child: Text(AppStrings.noUsers));
                }
                return RefreshIndicator(
                  onRefresh: () => ref.read(allUsersProvider.notifier).refresh(),
                  child: ListView.builder(
                    itemCount: users.length,
                    itemBuilder: (context, index) {
                      final user = users[index];
                      return _buildUserTile(context, ref, user);
                    },
                  ),
                );
              },
              loading: () => const LoadingWidget(message: AppStrings.loading),
              error: (e, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error, color: Colors.red, size: 48),
                    const SizedBox(height: 16),
                    Text(AppStrings.error),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: () => ref.read(allUsersProvider.notifier).refresh(),
                      child: const Text(AppStrings.tryAgain),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _statusFilter == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _statusFilter = value;
        });
        ref.read(allUsersProvider.notifier).filterByStatus(value);
      },
    );
  }

  Widget _buildUserTile(BuildContext context, WidgetRef ref, dynamic user) {
    return ListTile(
      leading: AvatarWidget(
        base64Image: user.profileImage,
        name: user.username,
        size: AppDimens.avatarLarge,
      ),
      title: Row(
        children: [
          Text(
            '@${user.username}',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(width: 8),
          _buildStatusBadge(user.status),
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(user.email),
          const SizedBox(height: 4),
          Text(
            '${StringUtils.formatNumber(user.followersCount)} followers  •  ${StringUtils.formatNumber(user.postsCount)} posts',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
      trailing: PopupMenuButton<String>(
        onSelected: (value) => _handleAction(context, ref, value, user),
        itemBuilder: (context) => [
          if (user.status == 'active')
            const PopupMenuItem(value: 'suspend', child: Text(AppStrings.suspend)),
          if (user.status == 'active')
            const PopupMenuItem(value: 'ban', child: Text(AppStrings.ban)),
          if (user.status != 'active')
            const PopupMenuItem(value: 'activate', child: Text('Activate')),
          const PopupMenuItem(value: 'delete', child: Text(AppStrings.delete, style: TextStyle(color: Colors.red))),
        ],
      ),
      onTap: () => context.go('/users/${user.id}'),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status) {
      case 'suspended':
        color = const Color(AppColors.suspended);
        break;
      case 'banned':
        color = const Color(AppColors.banned);
        break;
      default:
        color = const Color(AppColors.success);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  void _handleAction(BuildContext context, WidgetRef ref, String action, dynamic user) {
    String message = '';
    Future<void> Function() actionFn;

    switch (action) {
      case 'suspend':
        message = AppStrings.suspendConfirm;
        actionFn = () => ref.read(userActionsProvider.notifier).suspendUser(user.id);
        break;
      case 'ban':
        message = AppStrings.banConfirm;
        actionFn = () => ref.read(userActionsProvider.notifier).banUser(user.id);
        break;
      case 'activate':
        message = 'This will reactivate the user.';
        actionFn = () => ref.read(userActionsProvider.notifier).activateUser(user.id);
        break;
      case 'delete':
        message = AppStrings.deleteConfirm;
        actionFn = () => ref.read(userActionsProvider.notifier).deleteUser(user.id);
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
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(AppStrings.cancel),
          ),
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
}