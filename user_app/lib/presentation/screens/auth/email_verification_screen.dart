import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';

class EmailVerificationScreen extends ConsumerWidget {
  const EmailVerificationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppDimens.paddingLarge),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.mark_email_read, size: 80, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 24),
            Text(AppStrings.verifyEmail, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 12),
            Text('A verification email has been sent. Please check your inbox and verify your email address.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 32),
            ElevatedButton(onPressed: () => context.go(RouteNames.home), child: const Text('Continue')),
            const SizedBox(height: 12),
            TextButton(onPressed: () => context.go(RouteNames.login), child: Text(AppStrings.login)),
          ]),
        ),
      ),
    );
  }
}
