// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'services/auth_provider.dart';
import 'utils/app_theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/otp_screen.dart';
import 'screens/dashboard/dashboard_layout.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  runApp(const AttackAwareApp());
}

class AttackAwareApp extends StatelessWidget {
  const AttackAwareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider()..restoreSession(),
      child: MaterialApp(
        title: 'Attack Aware 3.0',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        initialRoute: '/splash',
        routes: {
          '/splash':    (_) => const SplashScreen(),
          '/login':     (_) => const LoginScreen(),
          '/register':  (_) => const RegisterScreen(),
          '/otp':       (_) => const OtpScreen(),
          '/dashboard': (_) => const DashboardLayout(),
        },
      ),
    );
  }
}

// ── Splash Screen ──────────────────────────────────────────────────────────────
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scaleAnim;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
    _scaleAnim = Tween<double>(begin: 0.6, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut));
    _fadeAnim  = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: const Interval(0.0, 0.6)));
    _ctrl.forward();
    _navigate();
  }

  Future<void> _navigate() async {
    await Future.delayed(const Duration(milliseconds: 2000));
    if (!mounted) return;
    final auth = context.read<AuthProvider>();
    // Wait for hydration
    while (!auth.isHydrated) {
      await Future.delayed(const Duration(milliseconds: 50));
    }
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed(auth.isAuthenticated ? '/dashboard' : '/login');
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: Stack(
          children: [
            // Glow blobs
            Positioned(top: -80, right: -80, child: _glowBlob(AppColors.purple.withOpacity(0.15), 300)),
            Positioned(bottom: -80, left: -80, child: _glowBlob(AppColors.blue.withOpacity(0.10), 280)),

            // Center content
            Center(
              child: FadeTransition(
                opacity: _fadeAnim,
                child: ScaleTransition(
                  scale: _scaleAnim,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Logo
                      Container(
                        width: 100, height: 100,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: [BoxShadow(color: AppColors.purple.withOpacity(0.5), blurRadius: 30, offset: const Offset(0, 10))],
                        ),
                        child: const Icon(Icons.security, color: Colors.white, size: 50),
                      ),
                      const SizedBox(height: 28),
                      const Text('Attack Aware', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 0.5)),
                      const SizedBox(height: 6),
                      ShaderMask(
                        shaderCallback: (bounds) => AppColors.primaryGradient.createShader(bounds),
                        child: const Text('3.0', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                      const SizedBox(height: 8),
                      const Text('Enterprise Security Training', style: TextStyle(fontSize: 14, color: AppColors.purpleLight, letterSpacing: 1.5)),
                      const SizedBox(height: 60),
                      const SizedBox(
                        width: 30, height: 30,
                        child: CircularProgressIndicator(color: AppColors.purple, strokeWidth: 2),
                      ),
                      const SizedBox(height: 16),
                      const Text('Loading...', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                    ],
                  ),
                ),
              ),
            ),

            // Version tag
            Positioned(
              bottom: 32,
              left: 0, right: 0,
              child: FadeTransition(
                opacity: _fadeAnim,
                child: const Column(
                  children: [
                    Text('Powered by Attack Aware™', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                    SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('500K+ Users  ', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                        Text('98% Accuracy  ', style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                        Text('24/7 Support',  style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _glowBlob(Color color, double size) => Container(
    width: size, height: size,
    decoration: BoxDecoration(shape: BoxShape.circle, color: color),
  );
}