import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/utils/string_utils.dart';
import '../../../data/models/post_model.dart';
import '../../../providers/posts/posts_provider.dart';
import '../image/avatar_widget.dart';
import '../image/base64_image.dart';

class PostCard extends ConsumerStatefulWidget {
  final PostModel post;
  final VoidCallback? onTap;
  final VoidCallback? onCommentTap;
  final bool showActions;

  const PostCard({
    super.key,
    required this.post,
    this.onTap,
    this.onCommentTap,
    this.showActions = true,
  });

  @override
  ConsumerState<PostCard> createState() => _PostCardState();
}

class _PostCardState extends ConsumerState<PostCard> {
  bool _isLiked = false;

  @override
  void initState() {
    super.initState();
    _isLiked = widget.post.isLiked;
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: widget.onTap,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppDimens.paddingMedium, vertical: AppDimens.paddingSmall),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AvatarWidget(
                  base64Image: post.userProfileImage,
                  name: post.userFullName,
                  size: AppDimens.avatarLarge,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Text(post.userFullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                const SizedBox(width: 4),
                                if (false) // isVerified from user data
                                  const Icon(Icons.verified, color: Color(AppColors.verified), size: 18),
                                const SizedBox(width: 4),
                                Text('@${post.username}', style: TextStyle(color: isDark ? const Color(AppColors.darkTextSecondary) : const Color(AppColors.textSecondary), fontSize: 14)),
                                const SizedBox(width: 4),
                                Text('· ${AppDateUtils.formatRelativeTime(post.createdAt)}', style: TextStyle(color: isDark ? const Color(AppColors.darkTextSecondary) : const Color(AppColors.textSecondary), fontSize: 14)),
                              ],
                            ),
                          ),
                          IconButton(icon: const Icon(Icons.more_horiz, size: 18), onPressed: () {}),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(post.content, style: const TextStyle(fontSize: 15, height: 1.3)),
                      if (post.image != null && post.image!.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(AppDimens.borderRadiusMedium),
                          child: Base64Image(base64String: post.image, width: double.infinity, height: 200),
                        ),
                      ],
                      const SizedBox(height: 12),
                      if (widget.showActions)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _ActionButton(
                              icon: Icons.comment_outlined,
                              count: post.commentsCount,
                              onTap: widget.onCommentTap,
                            ),
                            _ActionButton(
                              icon: Icons.repeat,
                              count: post.retweetsCount,
                              color: const Color(AppColors.retweet),
                            ),
                            _ActionButton(
                              icon: _isLiked ? Icons.favorite : Icons.favorite_border,
                              count: post.likesCount,
                              color: _isLiked ? const Color(AppColors.like) : null,
                              onTap: () => _toggleLike(),
                            ),
                            _ActionButton(icon: Icons.share_outlined),
                            _ActionButton(
                              icon: post.isBookmarked ? Icons.bookmark : Icons.bookmark_border,
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
        ],
      ),
    );
  }

  void _toggleLike() {
    setState(() => _isLiked = !_isLiked);
    ref.read(postLikeProvider.notifier).toggleLike(widget.post.id);
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final int? count;
  final Color? color;
  final VoidCallback? onTap;

  const _ActionButton({required this.icon, this.count, this.color, this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color ?? (isDark ? const Color(AppColors.darkTextSecondary) : const Color(AppColors.textSecondary))),
            if (count != null && count! > 0) ...[
              const SizedBox(width: 4),
              Text(
                StringUtils.formatNumber(count!),
                style: TextStyle(fontSize: 13, color: color ?? (isDark ? const Color(AppColors.darkTextSecondary) : const Color(AppColors.textSecondary))),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
