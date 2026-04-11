'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Zap,
  TrendingUp,
  User,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    try {
      await register(name, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-background overflow-hidden">

      {/* LEFT SIDE */}
      <motion.div
        className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 cyber-grid opacity-20" />
        </div>

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
                Protect Your Organization
              </h2>
              <p className="text-purple-200 mt-4 text-lg">
                Real-time simulations, comprehensive analytics, and engaging training for enterprise cybersecurity awareness.
              </p>
            </div>

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
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-500/30">
                      <Icon className="h-6 w-6 text-purple-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                      <p className="text-sm text-purple-200">{feature.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

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

      {/* RIGHT SIDE (REGISTER FORM) */}
      <motion.div
        className="flex flex-col justify-center items-center p-8 md:p-12 relative"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-8">
          <h2 className="text-3xl font-bold font-poppins text-foreground">Create Account</h2>
          <p className="text-muted-foreground">Join Attack Aware platform</p>

          {localError && (
            <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-red-300">{localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-12 py-3" placeholder="Full Name" value={name} onChange={(e)=>setName(e.target.value)} />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-12 py-3" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input type={showPassword?'text':'password'} className="pl-12 pr-12 py-3" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
              <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" className="pl-12 py-3" placeholder="Confirm Password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} />
            </div>

            <Button className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500">
              {isLoading ? 'Creating...' : <>Create Account <ArrowRight className="ml-2 w-4 h-4" /></>}
            </Button>

          </form>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account? <Link href="/login" className="text-purple-400">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}