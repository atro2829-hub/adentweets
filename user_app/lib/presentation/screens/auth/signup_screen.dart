import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/validators/auth_validator.dart';
import '../../../providers/auth/auth_provider.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});
  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _agreeTerms = false;

  @override
  void dispose() {
    _emailController.dispose();
    _usernameController.dispose();
    _fullNameController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _signup() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreeTerms) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please agree to the terms')));
      return;
    }
    await ref.read(signupProvider.notifier).signup(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      username: _usernameController.text.trim(),
      fullName: _fullNameController.text.trim(),
    );
    if (!mounted) return;
    final state = ref.read(signupProvider);
    if (state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error.toString())));
    } else {
      context.go(RouteNames.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    final signupState = ref.watch(signupProvider);
    final isLoading = signupState is AsyncLoading;

    return Scaffold(
      appBar: AppBar(leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop())),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppDimens.paddingLarge),
          child: Form(
            key: _formKey,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const SizedBox(height: 16),
              Text(AppStrings.createAccount, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 24),
              TextFormField(controller: _fullNameController, decoration: const InputDecoration(labelText: AppStrings.fullName, prefixIcon: Icon(Icons.person_outline)), validator: AuthValidator.validateName),
              const SizedBox(height: 16),
              TextFormField(controller: _usernameController, decoration: const InputDecoration(labelText: AppStrings.username, prefixIcon: Icon(Icons.alternate_email)), validator: AuthValidator.validateUsername),
              const SizedBox(height: 16),
              TextFormField(controller: _emailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: AppStrings.email, prefixIcon: Icon(Icons.email_outlined)), validator: AuthValidator.validateEmail),
              const SizedBox(height: 16),
              TextFormField(controller: _passwordController, obscureText: _obscurePassword, decoration: InputDecoration(labelText: AppStrings.password, prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility), onPressed: () => setState(() => _obscurePassword = !_obscurePassword))), validator: AuthValidator.validatePassword),
              const SizedBox(height: 16),
              TextFormField(controller: _confirmPasswordController, obscureText: _obscureConfirm, decoration: InputDecoration(labelText: AppStrings.confirmPassword, prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility), onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm))), validator: (v) => AuthValidator.validateConfirmPassword(v, _passwordController.text)),
              const SizedBox(height: 12),
              Row(children: [
                SizedBox(height: 24, width: 24, child: Checkbox(value: _agreeTerms, onChanged: (v) => setState(() => _agreeTerms = v ?? false))),
                const SizedBox(width: 8),
                Expanded(child: GestureDetector(onTap: () => setState(() => _agreeTerms = !_agreeTerms), child: Text(AppStrings.termsAgree, style: const TextStyle(fontSize: 12)))),
              ]),
              const SizedBox(height: 24),
              ElevatedButton(onPressed: isLoading ? null : _signup, child: isLoading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(AppStrings.signup)),
              const SizedBox(height: 24),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [Text(AppStrings.alreadyHaveAccount), TextButton(onPressed: () => context.pop(), child: Text(AppStrings.login))]),
            ]),
          ),
        ),
      ),
    );
  }
}
