// lib/screens/auth/otp_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';

enum OtpMode { signup, login }

class OtpArgs {
  final OtpMode mode;
  final String email;
  final String? tempToken; // only for OtpMode.login
  const OtpArgs({required this.mode, required this.email, this.tempToken});
}

class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _codeCtrl = TextEditingController();
  late OtpArgs _args;
  String? _tempToken;
  bool _initialised = false;
  bool _loading = false;
  String? _error;
  String? _info;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialised) {
      _args = ModalRoute.of(context)!.settings.arguments as OtpArgs;
      _tempToken = _args.tempToken;
      _initialised = true;
    }
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final code = _codeCtrl.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = 'Enter the 6-digit code');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });
    try {
      final auth = context.read<AuthProvider>();
      if (_args.mode == OtpMode.signup) {
        await auth.verifySignupOtp(_args.email, code);
      } else {
        await auth.verifyLoginOtp(_tempToken!, code);
      }
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/dashboard', (_) => false);
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });
    try {
      final auth = context.read<AuthProvider>();
      if (_args.mode == OtpMode.signup) {
        await auth.resendSignupOtp(_args.email);
      } else {
        _tempToken = await auth.resendLoginOtp(_tempToken!);
      }
      if (mounted) setState(() => _info = 'A new code has been sent to your email.');
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSignup = _args.mode == OtpMode.signup;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back_ios, color: AppColors.textSecondary),
                  padding: EdgeInsets.zero,
                ),
                const SizedBox(height: 12),
                Text(
                  isSignup ? 'Verify your email' : 'Two-factor verification',
                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                Text(
                  'We sent a 6-digit code to ${_args.email}',
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 28),
                TextField(
                  controller: _codeCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 28, letterSpacing: 10, color: AppColors.textPrimary),
                  decoration: const InputDecoration(counterText: '', hintText: '------'),
                  onSubmitted: (_) => _verify(),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: AppColors.red)),
                ],
                if (_info != null) ...[
                  const SizedBox(height: 12),
                  Text(_info!, style: const TextStyle(color: AppColors.green)),
                ],
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _verify,
                    child: _loading
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Verify'),
                  ),
                ),
                const SizedBox(height: 12),
                Center(
                  child: TextButton(
                    onPressed: _loading ? null : _resend,
                    child: const Text('Resend code'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
