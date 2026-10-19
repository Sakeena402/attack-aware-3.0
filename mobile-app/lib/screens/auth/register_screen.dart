// lib/screens/auth/register_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'otp_screen.dart';
import '../../services/auth_provider.dart';
import '../../utils/app_theme.dart';
import '../../widgets/common_widgets.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _industryController = TextEditingController();

  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _agreedToTerms = false;
  bool _isLoading = false;
  bool _isCompanySignup = false; // false = join as employee, true = register my company
  String? _localError;

  late final AnimationController _slideController;
  late final Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
        .animate(CurvedAnimation(parent: _slideController, curve: Curves.easeOut));
    _slideController.forward();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _companyNameController.dispose();
    _industryController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_agreedToTerms) {
      setState(() => _localError = 'Please agree to the Terms of Service');
      return;
    }

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _localError = 'Passwords do not match');
      return;
    }

    setState(() { _isLoading = true; _localError = null; });

    try {
      final email = _emailController.text.trim();
      await context.read<AuthProvider>().register(
        _nameController.text.trim(),
        email,
        _passwordController.text,
      );
      if (mounted) {
        Navigator.of(context).pushReplacementNamed(
          '/otp',
          arguments: OtpArgs(mode: OtpMode.signup, email: email),
        );
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
          child: SlideTransition(
            position: _slideAnim,
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

                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.security, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Attack Aware 3.0', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                          Text('Enterprise Security Training', style: TextStyle(fontSize: 11, color: AppColors.purpleLight)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  CyberCard(
                    borderColor: AppColors.purple.withOpacity(0.3),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Create Account', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                          const SizedBox(height: 4),
                          const Text('Join the platform today', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                          const SizedBox(height: 24),

                          // ── Account type toggle ──────────────────────────
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: AppColors.border.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () => setState(() => _isCompanySignup = false),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      decoration: BoxDecoration(
                                        color: !_isCompanySignup ? AppColors.purple : Colors.transparent,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        'Join as Employee',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          color: !_isCompanySignup ? Colors.white : AppColors.textMuted,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () => setState(() => _isCompanySignup = true),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      decoration: BoxDecoration(
                                        color: _isCompanySignup ? AppColors.purple : Colors.transparent,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        'Register My Company',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          color: _isCompanySignup ? Colors.white : AppColors.textMuted,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),

                          if (_localError != null)
                            Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.red.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.red.withOpacity(0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline, color: AppColors.red, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(_localError!, style: const TextStyle(color: AppColors.red, fontSize: 13))),
                                ],
                              ),
                            ),

                          CustomTextField(
                            label: 'Full Name',
                            hint: 'Enter your full name',
                            controller: _nameController,
                            prefixIcon: Icons.person_outline,
                            validator: (v) => v?.isEmpty == true ? 'Name is required' : null,
                          ),
                          const SizedBox(height: 16),

                          CustomTextField(
                            label: 'Email Address',
                            hint: 'you@company.com',
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            prefixIcon: Icons.email_outlined,
                            validator: (v) {
                              if (v?.isEmpty == true) return 'Email is required';
                              if (!v!.contains('@')) return 'Enter a valid email';
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // ── Company fields (only shown for company signup) ──
                          if (_isCompanySignup) ...[
                            CustomTextField(
                              label: 'Company Name',
                              hint: 'Acme Corporation',
                              controller: _companyNameController,
                              prefixIcon: Icons.business_outlined,
                              validator: (v) => (_isCompanySignup && (v?.isEmpty ?? true))
                                  ? 'Company name is required'
                                  : null,
                            ),
                            const SizedBox(height: 16),
                            CustomTextField(
                              label: 'Industry',
                              hint: 'e.g. Finance, Healthcare, Tech',
                              controller: _industryController,
                              prefixIcon: Icons.category_outlined,
                              validator: (v) => (_isCompanySignup && (v?.isEmpty ?? true))
                                  ? 'Industry is required'
                                  : null,
                            ),
                            const SizedBox(height: 16),
                          ],

                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _passwordController,
                                obscureText: !_showPassword,
                                style: const TextStyle(color: AppColors.textPrimary),
                                validator: (v) {
                                  if (v?.isEmpty == true) return 'Password is required';
                                  if ((v?.length ?? 0) < 6) return 'Minimum 6 characters';
                                  return null;
                                },
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

                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Confirm Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _confirmPasswordController,
                                obscureText: !_showConfirmPassword,
                                style: const TextStyle(color: AppColors.textPrimary),
                                validator: (v) {
                                  if (v?.isEmpty == true) return 'Please confirm your password';
                                  if (v != _passwordController.text) return 'Passwords do not match';
                                  return null;
                                },
                                decoration: InputDecoration(
                                  hintText: '••••••••',
                                  prefixIcon: const Icon(Icons.lock_outline, size: 18),
                                  suffixIcon: IconButton(
                                    icon: Icon(_showConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                                    onPressed: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 24,
                                height: 24,
                                child: Checkbox(
                                  value: _agreedToTerms,
                                  onChanged: (v) => setState(() => _agreedToTerms = v ?? false),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: RichText(
                                  text: TextSpan(
                                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                                    children: [
                                      const TextSpan(text: 'I agree to the '),
                                      TextSpan(text: 'Terms of Service', style: const TextStyle(color: AppColors.purple, fontWeight: FontWeight.w600)),
                                      const TextSpan(text: ' and '),
                                      TextSpan(text: 'Privacy Policy', style: const TextStyle(color: AppColors.purple, fontWeight: FontWeight.w600)),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),

                          GradientButton(
                            text: 'Create Account',
                            icon: Icons.arrow_forward,
                            isLoading: _isLoading,
                            onPressed: _handleSubmit,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('Already have an account? ', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: const Text('Sign in', style: TextStyle(color: AppColors.purple, fontWeight: FontWeight.w600, fontSize: 13)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}