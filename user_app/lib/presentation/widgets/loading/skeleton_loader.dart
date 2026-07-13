import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/constants/app_constants.dart';

class PostSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF22303C) : const Color(0xFFE5E7EB),
      highlightColor: isDark ? const Color(0xFF2F3336) : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(AppDimens.paddingMedium),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const CircleAvatar(radius: 20, backgroundColor: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Container(width: 120, height: 14, color: Colors.white),
                  const SizedBox(height: 8),
                  Container(width: double.infinity, height: 14, color: Colors.white),
                  const SizedBox(height: 6),
                  Container(width: 200, height: 14, color: Colors.white),
                ]),
              ),
            ]),
            const SizedBox(height: 12),
            Container(width: double.infinity, height: 160, color: Colors.white),
            const SizedBox(height: 12),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Container(width: 60, height: 14, color: Colors.white),
              Container(width: 60, height: 14, color: Colors.white),
              Container(width: 60, height: 14, color: Colors.white),
            ]),
          ],
        ),
      ),
    );
  }
}

class UserSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: ListTile(
        leading: const CircleAvatar(radius: 20, backgroundColor: Colors.white),
        title: Container(height: 14, width: 150, color: Colors.white),
        subtitle: Container(height: 12, width: 100, color: Colors.white, margin: const EdgeInsets.only(top: 6)),
      ),
    );
  }
}
