import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/utils/string_utils.dart';
import '../../../data/models/comment_model.dart';
import '../../image/avatar_widget.dart';
import '../../image/base64_image.dart';

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
      padding: const EdgeInsets.symmetric(vertical: AppDimens.paddingSM),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AvatarWidget(
            base64Image: comment.userProfileImage,
            radius: AppDimens.avatarMD / 2,
          ),
          const SizedBox(width: AppDimens.paddingMD),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      comment.username,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: AppDimens.fontMD,
                        color: isDark
                            ? AppColors.darkTextPrimary
                            : AppColors.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(width: AppDimens.paddingXS),
                    Text(
                      AppDateUtils.formatRelativeTime(comment.createdAt),
                      style: TextStyle(
                        fontSize: AppDimens.fontSM,
                        color: isDark
                            ? AppColors.darkTextSecondary
                            : AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppDimens.paddingXS),
                Text(
                  comment.content,
                  style: TextStyle(
                    fontSize: AppDimens.fontLG,
                    color: isDark
                        ? AppColors.darkTextPrimary
                        : AppColors.lightTextPrimary,
                    height: 1.4,
                  ),
                ),
                if (comment.image != null && comment.image!.isNotEmpty) ...[
                  const SizedBox(height: AppDimens.paddingSM),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppDimens.radiusMD),
                    child: Base64Image(
                      base64String: comment.image!,
                      height: 150,
                      width: double.infinity,
                    ),
                  ),
                ],
                const SizedBox(height: AppDimens.paddingXS),
                Row(
                  children: [
                    InkWell(
                      onTap: () => setState(() => _isLiked = !_isLiked),
                      borderRadius: BorderRadius.circular(AppDimens.radiusFull),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Row(
                          children: [
                            Icon(
                              _isLiked
                                  ? Icons.favorite
                                  : Icons.favorite_border,
                              color: _isLiked
                                  ? AppColors.likeRed
                                  : (isDark
                                      ? AppColors.darkTextSecondary
                                      : AppColors.lightTextSecondary),
                              size: AppDimens.iconSM + 2,
                            ),
                            if (comment.likesCount > 0) ...[
                              const SizedBox(width: 4),
                              Text(
                                StringUtils.formatNumber(comment.likesCount),
                                style: TextStyle(
                                  color: isDark
                                      ? AppColors.darkTextSecondary
                                      : AppColors.lightTextSecondary,
                                  fontSize: AppDimens.fontSM,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}