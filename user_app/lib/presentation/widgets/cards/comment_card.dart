import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/utils/string_utils.dart';
import '../../../data/models/comment_model.dart';
import '../image/avatar_widget.dart';
import '../image/base64_image.dart';

class CommentCard extends StatefulWidget {
  final CommentModel comment;

  const CommentCard({super.key, required this.comment});

  @override
  State<CommentCard> createState() => _CommentCardState();
}

class _CommentCardState extends State<CommentCard> {
  bool _isLiked = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final comment = widget.comment;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppDimens.paddingSmall),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AvatarWidget(
            base64Image: comment.userProfileImage,
            name: comment.userFullName,
            size: AppDimens.avatarMedium,
          ),
          const SizedBox(width: AppDimens.paddingSmall),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  comment.userFullName,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: isDark ? const Color(AppColors.darkTextPrimary) : const Color(AppColors.textPrimary),
                  ),
                ),
                Text(
                  '@${comment.username} · ${AppDateUtils.formatRelativeTime(comment.createdAt)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? const Color(AppColors.darkTextSecondary) : const Color(AppColors.textSecondary),
                  ),
                ),
                const SizedBox(height: 4),
                Text(comment.content, style: TextStyle(fontSize: 14, height: 1.4)),
                if (comment.image != null && comment.image!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppDimens.borderRadiusMedium),
                    child: Base64Image(base64String: comment.image, height: 150, width: double.infinity),
                  ),
                ],
                const SizedBox(height: 4),
                Row(children: [
                  InkWell(
                    onTap: () => setState(() => _isLiked = !_isLiked),
                    borderRadius: BorderRadius.circular(20),
                    child: Padding(
                      padding: const EdgeInsets.all(4),
                      child: Row(children: [
                        Icon(_isLiked ? Icons.favorite : Icons.favorite_border,
                          color: _isLiked ? const Color(AppColors.like) : (isDark ? const Color(AppColors.darkTextSecondary) : const Color(AppColors.textSecondary)),
                          size: 16),
                        if (comment.likesCount > 0) ...[
                          const SizedBox(width: 4),
                          Text(StringUtils.formatNumber(comment.likesCount),
                            style: TextStyle(fontSize: 12, color: isDark ? const Color(AppColors.darkTextSecondary) : const Color(AppColors.textSecondary))),
                        ],
                      ]),
                    ),
                  ),
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }
}