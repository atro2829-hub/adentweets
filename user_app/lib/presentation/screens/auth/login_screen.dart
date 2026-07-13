import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/validators/auth_validator.dart';
import '../../../providers/auth/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(loginProvider.notifier).login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
    if (!mounted) return;
    final state = ref.read(loginProvider);
    if (state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error.toString())));
    } else {
      context.go(RouteNames.home);
    }
  }

  Future<void> _loginWithGoogle() async {
    await ref.read(loginProvider.notifier).loginWithGoogle();
    if (!mounted) return;
    final state = ref.read(loginProvider);
    if (!state.hasError) {
      context.go(RouteNames.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loginState = ref.watch(loginProvider);
    final isLoading = loginState is AsyncLoading;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: AppDimens.paddingLarge),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(Icons.alternate_email, size: 64, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(height: 16),
                  Text(AppStrings.appName, textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Theme.of(context).colorScheme.primary)),
                  const SizedBox(height: 8),
                  Text(AppStrings.tagline, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 40),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: AppStrings.email, prefixIcon: Icon(Icons.email_outlined)),
                    validator: AuthValidator.validateEmail,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: AppStrings.password,
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility), onPressed: () => setState(() => _obscurePassword = !_obscurePassword)),
                    ),
                    validator: AuthValidator.validatePassword,
                  ),
                  Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () => context.push(RouteNames.forgotPassword), child: Text(AppStrings.forgotPassword))),
                  const SizedBox(height: 8),
                  ElevatedButton(onPressed: isLoading ? null : _login, child: isLoading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(AppStrings.login)),
                  const SizedBox(height: 16),
                  Row(children: [const Expanded(child: Divider()), Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text(AppStrings.orContinueWith, style: TextStyle(color: Colors.grey[600], fontSize: 13))), const Expanded(child: Divider())]),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(onPressed: _loginWithGoogle, icon: Image.asset('assets/icons/google.png', height: 20), label: Text('Sign in with ${AppStrings.google}')),
                  const SizedBox(height: 24),
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Text(AppStrings.dontHaveAccount, style: TextStyle(color: Colors.grey[600])),
                    TextButton(onPressed: () => context.push(RouteNames.signup), child: Text(AppStrings.signup)),
                  ]),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
