// 'use client';

// import { useState } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { motion } from 'framer-motion';
// import { useAuth } from '@/app/context/authContext';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { AlertCircle, Lock, Mail, User } from 'lucide-react';

// export default function RegisterPage() {
//   const router = useRouter();
//   const { register, state } = useAuth();
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [localError, setLocalError] = useState('');

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLocalError('');

//     if (!name || !email || !password || !confirmPassword) {
//       setLocalError('Please fill in all fields');
//       return;
//     }

//     if (password !== confirmPassword) {
//       setLocalError('Passwords do not match');
//       return;
//     }

//     if (password.length < 6) {
//       setLocalError('Password must be at least 6 characters');
//       return;
//     }

//     try {
//       await register(name, email, password);
//       router.push('/dashboard');
//     } catch (error) {
//       setLocalError(error instanceof Error ? error.message : 'Registration failed');
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
//       {/* Background elements */}
//       <div className="absolute inset-0 overflow-hidden pointer-events-none">
//         <motion.div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" animate={{ y: [0, 20, 0] }} transition={{ duration: 4, repeat: Infinity }}></motion.div>
//         <motion.div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" animate={{ y: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity }}></motion.div>
//       </div>

//       <motion.div className="w-full max-w-md relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
//         {/* Logo / Title */}
//         <motion.div className="text-center mb-8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
//           <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 mb-4">
//             <User className="w-8 h-8 text-white" />
//           </div>
//           <h1 className="text-3xl font-bold font-poppins bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
//             AttackAware3.0
//           </h1>
//           <p className="text-slate-400 mt-2 text-sm">Create Your Account</p>
//         </motion.div>

//         {/* Register Card */}
//         <motion.div className="backdrop-blur-xl bg-slate-900/50 border border-slate-700/50 rounded-2xl p-8 shadow-2xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
//           <h2 className="text-2xl font-bold text-white mb-6 font-poppins">Get Started</h2>

//           {/* Error Message */}
//           {(localError || state.error) && (
//             <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
//               <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
//               <p className="text-red-400 text-sm">{localError || state.error}</p>
//             </div>
//           )}

//           <form onSubmit={handleSubmit} className="space-y-4">
//             {/* Name Field */}
//             <div>
//               <label className="block text-sm font-medium text-slate-200 mb-2">
//                 Full Name
//               </label>
//               <div className="relative">
//                 <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
//                 <Input
//                   type="text"
//                   placeholder="John Doe"
//                   value={name}
//                   onChange={(e) => setName(e.target.value)}
//                   className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
//                 />
//               </div>
//             </div>

//             {/* Email Field */}
//             <div>
//               <label className="block text-sm font-medium text-slate-200 mb-2">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
//                 <Input
//                   type="email"
//                   placeholder="you@example.com"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
//                 />
//               </div>
//             </div>

//             {/* Password Field */}
//             <div>
//               <label className="block text-sm font-medium text-slate-200 mb-2">
//                 Password
//               </label>
//               <div className="relative">
//                 <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
//                 <Input
//                   type="password"
//                   placeholder="••••••••"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
//                 />
//               </div>
//             </div>

//             {/* Confirm Password Field */}
//             <div>
//               <label className="block text-sm font-medium text-slate-200 mb-2">
//                 Confirm Password
//               </label>
//               <div className="relative">
//                 <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
//                 <Input
//                   type="password"
//                   placeholder="••••••••"
//                   value={confirmPassword}
//                   onChange={(e) => setConfirmPassword(e.target.value)}
//                   className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
//                 />
//               </div>
//             </div>

//             {/* Terms */}
//             <label className="flex items-start gap-2 cursor-pointer">
//               <input type="checkbox" className="rounded border-slate-700 mt-1" required />
//               <span className="text-slate-400 text-sm">
//                 I agree to the{' '}
//                 <Link href="#" className="text-purple-400 hover:text-purple-300">
//                   Terms of Service
//                 </Link>
//                 {' '}and{' '}
//                 <Link href="#" className="text-purple-400 hover:text-purple-300">
//                   Privacy Policy
//                 </Link>
//               </span>
//             </label>

//             {/* Register Button */}
//             <Button
//               type="submit"
//               disabled={state.isLoading}
//               className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 mt-6"
//             >
//               {state.isLoading ? 'Creating account...' : 'Create Account'}
//             </Button>
//           </form>

//           {/* Sign In Link */}
//           <p className="text-center text-slate-400 text-sm mt-6">
//             Already have an account?{' '}
//             <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition">
//               Sign in
//             </Link>
//           </p>
//         </motion.div>
//       </motion.div>
//     </div>
//   );
// }



'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Lock, Mail, Eye, EyeOff, ArrowRight, Shield, Zap, TrendingUp, User } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, state } = useAuth();

  // ✅ ALL EMPTY — no demo data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError('');

    if (!name || !email || !password || !confirmPassword) {
      setLocalError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      await register(name, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background overflow-hidden">

      {/* ───── LEFT SIDE ───── identical to login */}
      <motion.div
        className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 cyber-grid opacity-20" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 cyber-glow">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white font-poppins">Attack Aware 3.0</h1>
              <p className="text-sm text-purple-300">Enterprise Security Training</p>
            </div>
          </motion.div>

          <motion.div
            className="mt-16 space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div>
              <h2 className="text-4xl font-bold text-white font-poppins leading-tight">
                Join the Platform
              </h2>
              <p className="text-purple-200 mt-4 text-lg">
                Real-time simulations, comprehensive analytics, and engaging training for enterprise cybersecurity awareness.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: Zap, title: 'Real-time Campaigns', desc: 'Launch simulations instantly' },
                { icon: TrendingUp, title: 'Advanced Analytics', desc: 'Track employee behavior' },
                { icon: Shield, title: 'Enterprise Grade', desc: 'Built for any scale' },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={idx}
                    className="flex gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                  >
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-500/30">
                        <Icon className="h-6 w-6 text-purple-300" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                      <p className="mt-1 text-sm text-purple-200">{feature.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Footer */}
       <motion.div
          className="relative z-10 space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-sm text-purple-300">
            Join thousands protecting their workforce
          </p>
          <div className="flex gap-4 text-sm text-purple-200">
            <span>500K+ Users</span>
            <span>98% Accuracy</span>
            <span>24/7 Support</span>
          </div>
        </motion.div>
      </motion.div>

      {/* ───── RIGHT SIDE — REGISTER FORM ───── */}
      <motion.div
        className="flex flex-col justify-center items-center p-8 md:p-12 relative"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-8">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold font-poppins text-foreground">Create Account</h2>
          
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Error */}
            {(localError || state.error) && (
              <motion.div
                className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 flex items-start gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-300">{localError || state.error}</span>
              </motion.div>
            )}

            {/* Full Name */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}>
              <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  className="pl-12 py-3 bg-muted/50 border-purple-500/20 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="Enter your full name"
                />
              </div>
            </motion.div>

            {/* Email */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
              <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  className="pl-12 py-3 bg-muted/50 border-purple-500/20 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="you@company.com"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pl-12 pr-12 py-3 bg-muted/50 border-purple-500/20 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4 text-muted-foreground" />
                    : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </motion.div>

            {/* Confirm Password */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
              <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pl-12 pr-12 py-3 bg-muted/50 border-purple-500/20 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword
                    ? <EyeOff className="w-4 h-4 text-muted-foreground" />
                    : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </motion.div>

            {/* Terms */}
            <motion.div
              className="flex items-center justify-between text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.48 }}
            >
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded mt-0.5" required />
                <span className="text-muted-foreground">
                  I agree to the{' '}
                  <Link href="#" className="text-purple-400 hover:text-purple-300 transition">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="#" className="text-purple-400 hover:text-purple-300 transition">Privacy Policy</Link>
                </span>
              </label>
            </motion.div>

            {/* Submit Button */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <Button
                type="submit"
                disabled={isLoading || state.isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 py-3 font-semibold flex items-center justify-center gap-2"
              >
                {isLoading || state.isLoading ? 'Creating account...' : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.form>

          {/* Sign In Link */}
          <motion.p
            className="text-center text-muted-foreground text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition">
              Sign in
            </Link>
          </motion.p>

        </div>
      </motion.div>
    </div>
  );
}