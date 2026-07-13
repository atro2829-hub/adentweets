import 'package:flutter/material.dart';
import '../../../core/utils/string_utils.dart';
import '../../../data/models/user_model.dart';
import '../image/avatar_widget.dart';

class UserCard extends StatelessWidget {
  final UserModel user;
  final VoidCallback? onTap;
  final VoidCallback? onFollowTap;
  final bool? isFollowing;

  const UserCard({super.key, required this.user, this.onTap, this.onFollowTap, this.isFollowing});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: AvatarWidget(base64Image: user.profileImage, name: user.fullName, size: 44),
      title: Row(children: [
        Text(user.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        if (user.isVerified) ...[
          const SizedBox(width: 4),
          const Icon(Icons.verified, color: Color(0xFF1DA1F2), size: 16),
        ],
      ]),
      subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('@${user.username}', style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6))),
        if (user.bio.isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(user.bio, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
        ],
      ]),
      trailing: onFollowTap != null
          ? SizedBox(
              width: 100,
              child: ElevatedButton(
                onPressed: onFollowTap,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 32),
                  padding: EdgeInsets.zero,
                  backgroundColor: isFollowing == true ? Colors.transparent : const Color(0xFF1DA1F2),
                  foregroundColor: isFollowing == true ? const Color(0xFF1DA1F2) : Colors.white,
                  side: isFollowing == true ? const BorderSide(color: Color(0xFF1DA1F2)) : null,
                ),
                child: Text(isFollowing == true ? 'Following' : 'Follow', style: const TextStyle(fontSize: 13)),
              ),
            )
          : null,
    );
  }
}
