import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/utils/string_utils.dart';
import '../../../core/constants/app_constants.dart';

class AvatarWidget extends StatelessWidget {
  final String? base64Image;
  final String? name;
  final double size;
  final VoidCallback? onTap;

  const AvatarWidget({
    super.key,
    this.base64Image,
    this.name,
    this.size = AppDimens.avatarMedium,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget avatar;
    if (base64Image != null && base64Image!.isNotEmpty) {
      try {
        final bytes = base64Decode(base64Image!);
        avatar = CircleAvatar(
          radius: size / 2,
          backgroundImage: MemoryImage(bytes),
          onBackgroundImageError: (_, __) {},
          backgroundColor: const Color(0xFFE5E7EB),
        );
      } catch (e) {
        avatar = _buildFallback();
      }
    } else {
      avatar = _buildFallback();
    }

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: avatar);
    }
    return avatar;
  }

  Widget _buildFallback() {
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: const Color(AppColors.primary).withOpacity(0.1),
      child: Text(
        StringUtils.getInitials(name ?? ''),
        style: TextStyle(
          color: const Color(AppColors.primary),
          fontSize: size * 0.35,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
