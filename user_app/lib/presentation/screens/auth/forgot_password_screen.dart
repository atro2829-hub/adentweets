import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/validators/auth_validator.dart';
import '../../../providers/auth/auth_provider.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _sent = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _reset() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(passwordResetProvider.notifier).resetPassword(_emailController.text.trim());
    if (!mounted) return;
    final state = ref.read(passwordResetProvider);
    if (!state.hasError) {
      setState(() => _sent = true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop())),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppDimens.paddingLarge),
          child: Form(
            key: _formKey,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const SizedBox(height: 32),
              Icon(Icons.lock_reset, size: 64, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 24),
              Text(AppStrings.resetPassword, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text(_sent ? AppStrings.sentResetEmail : 'Enter your email to receive a password reset link', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 24),
              if (!_sent) ...[
                TextFormField(controller: _emailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: AppStrings.email, prefixIcon: Icon(Icons.email_outlined)), validator: AuthValidator.validateEmail),
                const SizedBox(height: 24),
                ElevatedButton(onPressed: _reset, child: Text(AppStrings.sendResetLink)),
              ],
              const SizedBox(height: 16),
              TextButton(onPressed: () => context.pop(), child: Text(AppStrings.login)),
            ]),
          ),
        ),
      ),
    );
  }
}
