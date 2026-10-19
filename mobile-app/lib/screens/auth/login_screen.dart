// lib/screens/auth/login_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'otp_screen.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showPassword = false;
  bool _rememberMe = true;
  String? _localError;
  bool _isLoading = false;

  late final AnimationController _fadeController;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _fadeAnim = CurvedAnimation(parent: _fadeController, curve: Curves.easeOut);
    _fadeController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _isLoading = true; _localError = null; });

    try {
      final email = _emailController.text.trim();
      final outcome = await context.read<AuthProvider>().login(email, _passwordController.text);
      if (!mounted) return;
      if (outcome.requires2FA) {
        Navigator.of(context).pushNamed(
          '/otp',
          arguments: OtpArgs(
            mode: OtpMode.login,
            email: outcome.email ?? email,
            tempToken: outcome.tempToken,
          ),
        );
      } else {
        Navigator.of(context).pushReplacementNamed('/dashboard');
      }
    } catch (e) {
      setState(() => _localError = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 20),
                  _buildHeader(),
                  const SizedBox(height: 40),
                  _buildFeaturesBanner(),
                  const SizedBox(height: 32),
                  _buildFormCard(),
                  const SizedBox(height: 24),
                  _buildSignUpLink(),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [BoxShadow(color: AppColors.purple.withOpacity(0.4), blurRadius: 12)],
          ),
          child: const Icon(Icons.security, color: Colors.white, size: 26),
        ),
        const SizedBox(width: 12),
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Attack Aware 3.0', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
            Text('Enterprise Security Training', style: TextStyle(fontSize: 12, color: AppColors.purpleLight)),
          ],
        ),
      ],
    );
  }

  Widget _buildFeaturesBanner() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Protect Your\nOrganization', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white, height: 1.2)),
        const SizedBox(height: 16),
        const FeatureItem(icon: Icons.bolt, title: 'Real-time Campaigns', description: 'Launch simulations instantly'),
        const SizedBox(height: 12),
        const FeatureItem(icon: Icons.trending_up, title: 'Advanced Analytics', description: 'Track employee behavior'),
        const SizedBox(height: 12),
        const FeatureItem(icon: Icons.shield, title: 'Enterprise Grade', description: 'Built for any scale'),
        const SizedBox(height: 20),
        const Divider(color: AppColors.border),
        const SizedBox(height: 12),
        Row(
          children: ['500K+ Users', '98% Accuracy', '24/7 Support'].map((t) => Expanded(
            child: Text(t, style: const TextStyle(color: AppColors.purpleLight, fontSize: 11), textAlign: TextAlign.center),
          )).toList(),
        ),
      ],
    );
  }

  Widget _buildFormCard() {
    return CyberCard(
      borderColor: AppColors.purple.withOpacity(0.3),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Welcome Back', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            const SizedBox(height: 4),
            const Text('Sign in to your Attack Aware dashboard', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
            const SizedBox(height: 24),

            if (_localError != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.red.withOpacity(0.15), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.red.withOpacity(0.3))),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.red, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_localError!, style: const TextStyle(color: AppColors.red, fontSize: 13))),
                  ],
                ),
              ),

            CustomTextField(
              label: 'Email Address',
              hint: 'you@company.com',
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              prefixIcon: Icons.email_outlined,
              validator: (v) => v?.isEmpty == true ? 'Email required' : null,
            ),
            const SizedBox(height: 16),

            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _passwordController,
                  obscureText: !_showPassword,
                  style: const TextStyle(color: AppColors.textPrimary),
                  validator: (v) => v?.isEmpty == true ? 'Password required' : null,
                  decoration: InputDecoration(
                    hintText: '••••••••',
                    prefixIcon: const Icon(Icons.lock_outline, size: 18),
                    suffixIcon: IconButton(
                      icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                      onPressed: () => setState(() => _showPassword = !_showPassword),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            Row(
              children: [
                Transform.scale(
                  scale: 0.9,
                  child: Checkbox(value: _rememberMe, onChanged: (v) => setState(() => _rememberMe = v ?? true)),
                ),
                const Text('Remember me', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                const Spacer(),
                TextButton(
                  onPressed: () {},
                  child: const Text('Forgot password?', style: TextStyle(color: AppColors.purple, fontSize: 13)),
                ),
              ],
            ),
            const SizedBox(height: 20),

            GradientButton(
              text: 'Sign In',
              icon: Icons.arrow_forward,
              isLoading: _isLoading,
              onPressed: _handleSubmit,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSignUpLink() {
    return Center(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text("Don't have an account? ", style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
            child: const Text('Sign up', style: TextStyle(color: AppColors.purple, fontWeight: FontWeight.w600, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}