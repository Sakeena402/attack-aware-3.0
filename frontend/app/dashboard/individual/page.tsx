'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/authContext';
import { useRouter } from 'next/navigation';
import {
  Shield, Gamepad2, Video, Bug,
  Lightbulb, TrendingUp, MessageSquare, Wrench,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

// ── Feature cards config ──────────────────────────────────────────────────────

const EN_FEATURES = [
  {
    icon: Shield,
    title: 'Security Quizzes',
    desc: 'Test your knowledge of cyber security threats and best practices.',
    btn: 'Start Quiz',
    href: '/dashboard/quizzes',
    color: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-400',
    border: 'hover:border-blue-500/50',
  },
  {
    icon: Gamepad2,
    title: 'Awareness Games',
    desc: 'Play fun and interactive games to improve your cyber awareness.',
    btn: 'Play Now',
    href: '/dashboard/games',
    color: 'from-purple-500/20 to-purple-600/10',
    iconColor: 'text-purple-400',
    border: 'hover:border-purple-500/50',
  },
  {
    icon: Video,
    title: 'Awareness Videos',
    desc: 'Watch short, engaging videos about common online threats.',
    btn: 'Watch',
    href: '/dashboard/videos',
    color: 'from-green-500/20 to-green-600/10',
    iconColor: 'text-green-400',
    border: 'hover:border-green-500/50',
  },
  {
    icon: Bug,
    title: 'Threat Alerts',
    desc: 'Get updated on the latest cyber security threats and scams.',
    btn: 'View Alerts',
    href: '/dashboard/attacks',
    color: 'from-red-500/20 to-red-600/10',
    iconColor: 'text-red-400',
    border: 'hover:border-red-500/50',
  },
  {
    icon: Lightbulb,
    title: 'Tips & Tricks',
    desc: 'Learn essential tips to protect your data and stay safe online.',
    btn: 'Learn More',
    href: '/dashboard/progress',
    color: 'from-yellow-500/20 to-yellow-600/10',
    iconColor: 'text-yellow-400',
    border: 'hover:border-yellow-500/50',
  },
  {
    icon: TrendingUp,
    title: 'My Progress',
    desc: 'Track your learning journey and achievements in cyber security.',
    btn: 'View Progress',
    href: '/dashboard/progress',
    color: 'from-cyan-500/20 to-cyan-600/10',
    iconColor: 'text-cyan-400',
    border: 'hover:border-cyan-500/50',
  },
  {
    icon: MessageSquare,
    title: 'Discussion Forum',
    desc: 'Connect with experts and share your security concerns.',
    btn: 'Join Discussion',
    href: '/dashboard/forum',
    color: 'from-indigo-500/20 to-indigo-600/10',
    iconColor: 'text-indigo-400',
    border: 'hover:border-indigo-500/50',
  },
  {
    icon: Wrench,
    title: 'Cyber Tools',
    desc: 'Learn about essential tools like VPN, Firewall, Antivirus, and more.',
    btn: 'Explore',
    href: '/dashboard/attacks',
    color: 'from-orange-500/20 to-orange-600/10',
    iconColor: 'text-orange-400',
    border: 'hover:border-orange-500/50',
  },
];

const UR_FEATURES = [
  {
    icon: Shield,
    title: 'سیکیورٹی کوئزز',
    desc: 'سائبر سیکیورٹی کے خطرات اور بہترین طریقہ کار کا علم جانچیں۔',
    btn: 'کوئز شروع کریں',
    href: '/dashboard/quizzes',
    color: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-400',
    border: 'hover:border-blue-500/50',
  },
  {
    icon: Gamepad2,
    title: 'آگاہی کھیل',
    desc: 'مزے دار اور انٹرایکٹو کھیل کھیلیں تاکہ اپنی سائبر شعور بہتر کریں۔',
    btn: 'اب کھیلیں',
    href: '/dashboard/games',
    color: 'from-purple-500/20 to-purple-600/10',
    iconColor: 'text-purple-400',
    border: 'hover:border-purple-500/50',
  },
  {
    icon: Video,
    title: 'آگاہی ویڈیوز',
    desc: 'عام آن لائن خطرات کے بارے میں مختصر اور دلچسپ ویڈیوز دیکھیں۔',
    btn: 'دیکھیں',
    href: '/dashboard/videos',
    color: 'from-green-500/20 to-green-600/10',
    iconColor: 'text-green-400',
    border: 'hover:border-green-500/50',
  },
  {
    icon: Bug,
    title: 'خطرات کی الرٹس',
    desc: 'تازہ ترین سائبر سیکیورٹی خطرات اور فراڈ کے بارے میں جانیں۔',
    btn: 'الرٹس دیکھیں',
    href: '/dashboard/attacks',
    color: 'from-red-500/20 to-red-600/10',
    iconColor: 'text-red-400',
    border: 'hover:border-red-500/50',
  },
  {
    icon: Lightbulb,
    title: 'ٹپس اور ترکیبیں',
    desc: 'اپنے ڈیٹا کو محفوظ رکھنے کے ضروری ٹپس سیکھیں۔',
    btn: 'مزید جانیں',
    href: '/dashboard/progress',
    color: 'from-yellow-500/20 to-yellow-600/10',
    iconColor: 'text-yellow-400',
    border: 'hover:border-yellow-500/50',
  },
  {
    icon: TrendingUp,
    title: 'میری ترقی',
    desc: 'اپنی سیکھنے کی ترقی اور سائبر سیکیورٹی میں کامیابیوں کو ٹریک کریں۔',
    btn: 'ترقی دیکھیں',
    href: '/dashboard/progress',
    color: 'from-cyan-500/20 to-cyan-600/10',
    iconColor: 'text-cyan-400',
    border: 'hover:border-cyan-500/50',
  },
  {
    icon: MessageSquare,
    title: 'کمیونٹی فورم',
    desc: 'ماہرین سے رابطہ کریں اور اپنے حفاظتی خدشات کا تبادلہ کریں۔',
    btn: 'گفتگو میں شامل ہوں',
    href: '/dashboard/forum',
    color: 'from-indigo-500/20 to-indigo-600/10',
    iconColor: 'text-indigo-400',
    border: 'hover:border-indigo-500/50',
  },
  {
    icon: Wrench,
    title: 'سائبر ٹولز',
    desc: 'ضروری ٹولز جیسے VPN، فائر وال، اینٹی وائرس اور مزید کے بارے میں جانیں۔',
    btn: 'دریافت کریں',
    href: '/dashboard/attacks',
    color: 'from-orange-500/20 to-orange-600/10',
    iconColor: 'text-orange-400',
    border: 'hover:border-orange-500/50',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IndividualDashboard() {
  const { state } = useAuth();
  const router = useRouter();
  const name = state.user?.name ?? 'User';

  // Simple lang toggle stored in localStorage
  const [isUrdu, setIsUrdu] = 
    typeof window !== 'undefined'
      ? [
          localStorage.getItem('aa_lang') === 'ur',
          (v: boolean) => localStorage.setItem('aa_lang', v ? 'ur' : 'en'),
        ]
      : [false, () => {}];

  const features = isUrdu ? UR_FEATURES : EN_FEATURES;

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isUrdu ? `خوش آمدید، ${name} 👋` : `Welcome, ${name} 👋`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isUrdu
              ? 'اپنی سائبر سیکیورٹی کا سفر جاری رکھیں'
              : 'Continue your cybersecurity awareness journey'}
          </p>
        </div>

        {/* Language Toggle */}
        <button
          onClick={() => setIsUrdu(!isUrdu)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-blue-500/50 text-sm text-slate-300 transition-colors shrink-0"
        >
          🌐 {isUrdu ? 'Switch to English' : 'اردو میں دیکھیں'}
        </button>
      </motion.div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={`
                  bg-gradient-to-br ${feature.color}
                  border-slate-700/50 ${feature.border}
                  transition-all duration-300 cursor-pointer
                  hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20
                  h-full p-5 flex flex-col
                `}
                onClick={() => router.push(feature.href)}
              >
                <Icon className={`w-10 h-10 ${feature.iconColor} mb-4`} />
                <h3 className="font-semibold text-foreground mb-2 text-sm">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1"
                  dir={isUrdu ? 'rtl' : 'ltr'}>
                  {feature.desc}
                </p>
                <div className={`flex items-center gap-1 mt-4 text-xs font-semibold ${feature.iconColor}`}>
                  {feature.btn}
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}