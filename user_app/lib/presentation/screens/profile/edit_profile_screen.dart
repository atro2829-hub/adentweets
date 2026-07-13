import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/validators/auth_validator.dart';
import '../../../data/services/user_service.dart';
import '../../../providers/auth/auth_provider.dart';
import '../../widgets/image/avatar_widget.dart';
import '../../widgets/image/base64_image.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});
  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _bioController = TextEditingController();
  String? _profileImage;
  String? _bannerImage;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    _nameController.text = user?.fullName ?? '';
    _usernameController.text = user?.username ?? '';
    _bioController.text = user?.bio ?? '';
    _profileImage = user?.profileImage;
    _bannerImage = user?.bannerImage;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _pickProfileImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (image != null) {
      final bytes = await image.readAsBytes();
      setState(() => _profileImage = base64Encode(bytes));
    }
  }

  Future<void> _pickBannerImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70, maxWidth: 1080);
    if (image != null) {
      final bytes = await image.readAsBytes();
      setState(() => _bannerImage = base64Encode(bytes));
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      final user = ref.read(currentUserProvider);
      if (user == null) return;
      final service = UserService(user.id);
      await service.updateUser(user.id, {
        'fullName': _nameController.text.trim(),
        'username': _usernameController.text.trim(),
        'bio': _bioController.text.trim(),
        if (_profileImage != null) 'profileImage': _profileImage,
        if (_bannerImage != null) 'bannerImage': _bannerImage,
      });
      ref.read(currentUserProvider.notifier).updateUser({
        'fullName': _nameController.text.trim(),
        'username': _usernameController.text.trim(),
        'bio': _bioController.text.trim(),
        'profileImage': _profileImage,
        'bannerImage': _bannerImage,
      });
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: IconButton(icon: const Icon(Icons.close), onPressed: () => context.pop()), title: const Text(AppStrings.editProfile, style: TextStyle(fontSize: 16)), actions: [TextButton(onPressed: _isLoading ? null : _save, child: const Text(AppStrings.save))]),
      body: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Stack(children: [
            Container(height: 150, color: Colors.grey[300], child: _bannerImage != null ? Base64Image(base64String: _bannerImage, width: double.infinity, height: 150) : null),
            Positioned(bottom: 0, left: AppDimens.paddingMedium, child: GestureDetector(onTap: _pickProfileImage, child: Stack(children: [
              AvatarWidget(base64Image: _profileImage, name: _nameController.text, size: 80),
              Positioned(bottom: 0, right: 0, child: Container(decoration: const BoxDecoration(color: Color(AppColors.primary), shape: BoxShape.circle), padding: const EdgeInsets.all(4), child: const Icon(Icons.camera_alt, color: Colors.white, size: 16))),
            ]))),
            Positioned(bottom: 8, right: AppDimens.paddingMedium, child: IconButton(onPressed: _pickBannerImage, icon: Container(decoration: BoxDecoration(color: Theme.of(context).scaffoldBackgroundColor, shape: BoxShape.circle), padding: const EdgeInsets.all(8), child: const Icon(Icons.camera_alt, size: 20)))),
          ]),
          Padding(
            padding: const EdgeInsets.all(AppDimens.paddingLarge),
            child: Form(
              key: _formKey,
              child: Column(children: [
                TextFormField(controller: _nameController, decoration: const InputDecoration(labelText: AppStrings.fullName), validator: AuthValidator.validateName),
                const SizedBox(height: 16),
                TextFormField(controller: _usernameController, decoration: const InputDecoration(labelText: AppStrings.username, prefixText: '@'), validator: AuthValidator.validateUsername),
                const SizedBox(height: 16),
                TextFormField(controller: _bioController, maxLines: 3, decoration: const InputDecoration(labelText: AppStrings.bio), maxLength: 160),
                const SizedBox(height: 24),
                if (_isLoading) const Center(child: CircularProgressIndicator()) else ElevatedButton(onPressed: _save, child: Text(AppStrings.save)),
              ]),
            ),
          ),
        ]),
      ),
    );
  }
}
