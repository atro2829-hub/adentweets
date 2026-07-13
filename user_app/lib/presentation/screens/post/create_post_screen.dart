import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/string_utils.dart';
import '../../../providers/auth/auth_provider.dart';
import '../../../providers/posts/posts_provider.dart';
import '../../widgets/image/avatar_widget.dart';

class CreatePostScreen extends ConsumerStatefulWidget {
  const CreatePostScreen({super.key});

  @override
  ConsumerState<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends ConsumerState<CreatePostScreen> {
  final _contentController = TextEditingController();
  String? _base64Image;
  bool _isPicking = false;

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    setState(() => _isPicking = true);
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
      if (image != null) {
        final bytes = await image.readAsBytes();
        setState(() => _base64Image = base64Encode(bytes));
      }
    } finally {
      setState(() => _isPicking = false);
    }
  }

  Future<void> _post() async {
    if (_contentController.text.trim().isEmpty && _base64Image == null) return;
    await ref.read(postCreationProvider.notifier).createPost(content: _contentController.text.trim(), image: _base64Image);
    if (!mounted) return;
    final state = ref.read(postCreationProvider);
    if (state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error.toString())));
    } else {
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final creationState = ref.watch(postCreationProvider);
    final isLoading = creationState is AsyncLoading;
    final remaining = AppDimens.maxPostLength - _contentController.text.length;
    final canPost = _contentController.text.trim().isNotEmpty || _base64Image != null;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => context.pop()),
        title: const Text('New Post', style: TextStyle(fontSize: 16)),
        actions: [Padding(padding: const EdgeInsets.all(8), child: ElevatedButton(onPressed: isLoading || !canPost ? null : _post, child: isLoading ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(AppStrings.post)))],
      ),
      body: Column(children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppDimens.paddingMedium),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AvatarWidget(base64Image: user?.profileImage, name: user?.fullName, size: 44),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                TextField(
                  controller: _contentController,
                  maxLines: null,
                  maxLength: AppDimens.maxPostLength.toInt(),
                  decoration: const InputDecoration(border: InputBorder.none, hintText: AppStrings.whatIsHappening, counterText: ''),
                  onChanged: (_) => setState(() {}),
                ),
                if (_base64Image != null) ...[
                  const SizedBox(height: 12),
                  Stack(children: [
                    ClipRRect(borderRadius: BorderRadius.circular(AppDimens.borderRadiusMedium), child: Image.memory(base64Decode(_base64Image!), height: 200, width: double.infinity, fit: BoxFit.cover)),
                    Positioned(top: 8, right: 8, child: GestureDetector(onTap: () => setState(() => _base64Image = null), child: Container(decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle), child: const Icon(Icons.close, color: Colors.white, size: 20)))),
                  ]),
                ],
              ])),
            ]),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: AppDimens.paddingMedium, vertical: 8),
          decoration: BoxDecoration(border: Border(top: BorderSide(color: Theme.of(context).dividerColor))),
          child: Row(children: [
            IconButton(icon: const Icon(Icons.image_outlined, color: Color(AppColors.primary)), onPressed: _isPicking ? null : _pickImage),
            const SizedBox(width: 8),
            Text('$remaining', style: TextStyle(color: remaining < 0 ? Colors.red : Colors.grey, fontSize: 13)),
            const Spacer(),
          ]),
        ),
      ]),
    );
  }
}
