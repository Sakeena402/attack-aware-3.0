'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Shield, Menu, X, ArrowRight, CheckCircle2, Lock, AlertTriangle,
  BarChart3, Users, Zap, TrendingUp, Star, Github, Linkedin, Twitter,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const hoverVariants = {
  hover: {
    y: -8,
    boxShadow: '0 20px 40px rgba(124, 58, 237, 0.15)',
    transition: { duration: 0.3 },
  },
};

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      setScrolled(window.scrollY > 50);
    }, { passive: true });
  }

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#howitworks' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <div className="bg-black text-white overflow-hidden">
      {/* Navigation */}
      <motion.nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-black/80 backdrop-blur-xl border-b border-purple-500/10'
            : 'bg-transparent'
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.05 }}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 flex items-center justify-center relative">
              <motion.div
                className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-400 to-blue-400 opacity-0"
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Shield className="w-6 h-6 text-white relative z-10" />
            </div>
            <span className="text-xl font-bold font-poppins bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              CyberAwareSim
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <motion.a
                key={link.label}
                href={link.href}
                className="px-3 py-2 text-sm text-gray-300 hover:text-white transition"
                whileHover={{ color: '#fff' }}
              >
                {link.label}
              </motion.a>
            ))}
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <motion.div
          className="md:hidden bg-black/95 backdrop-blur-xl border-b border-purple-500/10"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: mobileMenuOpen ? 1 : 0, height: mobileMenuOpen ? 'auto' : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-gray-300 hover:text-white transition py-2"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 border-t border-purple-500/10 space-y-2">
              <Link href="/login" className="block">
                <Button variant="ghost" className="w-full text-gray-300 hover:text-white">
                  Login
                </Button>
              </Link>
              <Link href="/register" className="block">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 px-4 overflow-hidden" id="home">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div
            className="absolute top-20 right-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"
            animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 left-10 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"
            animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          
          {/* Cyber Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-6"
              >
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">Transform Your Security Culture</span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-5xl md:text-6xl font-bold font-poppins mb-6 leading-tight"
              >
                Protect Your Organization from
                <span className="bg-gradient-to-r from-purple-400 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                  {' '}Social Engineering Attacks
                </span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-lg text-gray-400 mb-8 max-w-lg"
              >
                Train employees against phishing, smishing, and vishing attacks with interactive simulations and
                real-time analytics. Reduce your organization's risk with proven security awareness training.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-6 text-base rounded-lg">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-purple-500/30 text-white hover:bg-purple-500/10 px-8 py-6 text-base rounded-lg"
                >
                  Request Demo
                </Button>
              </motion.div>

              {/* Metrics */}
              <motion.div
                variants={itemVariants}
                className="mt-12 pt-8 border-t border-purple-500/20 grid grid-cols-3 gap-6"
              >
                {[
                  { value: '500K+', label: 'Employees Trained' },
                  { value: '90%', label: 'Phishing Attacks' },
                  { value: '98%', label: 'Detection Improvement' },
                ].map((metric, idx) => (
                  <div key={idx}>
                    <div className="text-2xl font-bold text-purple-400">{metric.value}</div>
                    <div className="text-sm text-gray-400">{metric.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right - Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-2xl opacity-30"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <div className="relative bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-xl">
                <div className="bg-black rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-400">Dashboard Overview</div>
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Active Users', value: '2,482', color: 'from-purple-600 to-purple-400' },
                      { label: 'Campaigns', value: '24', color: 'from-blue-600 to-blue-400' },
                      { label: 'Avg. Click Rate', value: '28%', color: 'from-cyan-600 to-cyan-400' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-20 h-2 bg-gradient-to-r ${item.color} rounded-full`} />
                          <span className="text-white font-semibold">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-black via-purple-900/10 to-black" id="features">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-6"
            >
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Complete Platform</span>
            </motion.div>

            <motion.h2
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold font-poppins mb-6"
            >
              Everything You Need to Train & Protect
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-400 max-w-2xl mx-auto"
            >
              Comprehensive tools to simulate real attacks, train employees, and measure security awareness
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: AlertTriangle,
                title: 'Phishing Simulations',
                description: 'Realistic email-based attacks to test employee awareness and identify vulnerable users',
                color: 'from-red-600 to-red-400',
              },
              {
                icon: Zap,
                title: 'Smishing Campaigns',
                description: 'SMS-based social engineering tests to train employees against text message threats',
                color: 'from-yellow-600 to-yellow-400',
              },
              {
                icon: Lock,
                title: 'Vishing Defense',
                description: 'Voice-based attack simulations to teach employees to identify phone-based threats',
                color: 'from-green-600 to-green-400',
              },
              {
                icon: Users,
                title: 'Interactive Training',
                description: 'Personalized learning paths with instant feedback and microlearning modules',
                color: 'from-blue-600 to-blue-400',
              },
              {
                icon: TrendingUp,
                title: 'Leaderboards',
                description: 'Gamified competitions to boost engagement and foster security culture',
                color: 'from-purple-600 to-purple-400',
              },
              {
                icon: BarChart3,
                title: 'Analytics Dashboard',
                description: 'Real-time insights with detailed metrics and customizable security reports',
                color: 'from-cyan-600 to-cyan-400',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={hoverVariants.hover}
                className="group p-8 rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-purple-500/10 hover:border-purple-500/30 transition-all"
              >
                <motion.div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:shadow-lg transition-shadow`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </motion.div>

                <h3 className="text-lg font-semibold font-poppins mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 bg-black" id="howitworks">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold font-poppins mb-6"
            >
              How It Works
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-400 max-w-2xl mx-auto"
            >
              A simple yet powerful approach to building a culture of security awareness
            </motion.p>
          </motion.div>

          {/* Timeline */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-4 gap-6 relative"
          >
            {[
              {
                step: '01',
                title: 'Create Campaigns',
                description: 'Design targeted training campaigns for your organization',
              },
              {
                step: '02',
                title: 'Simulate Attacks',
                description: 'Launch realistic phishing, smishing, or vishing simulations',
              },
              {
                step: '03',
                title: 'Train Employees',
                description: 'Provide instant feedback and personalized training modules',
              },
              {
                step: '04',
                title: 'Analyze Results',
                description: 'Track progress with comprehensive analytics and metrics',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="relative"
              >
                <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-purple-500/10 h-full">
                  <motion.div
                    className="text-5xl font-bold text-transparent bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text mb-4"
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    viewport={{ once: true }}
                  >
                    {item.step}
                  </motion.div>

                  <h3 className="text-lg font-semibold font-poppins mb-3">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.description}</p>
                </div>

                {idx < 3 && (
                  <motion.div
                    className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: idx * 0.2 }}
                    viewport={{ once: true }}
                  >
                    <ArrowRight className="w-6 h-6 text-purple-500/50" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-black via-purple-900/10 to-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold font-poppins mb-6"
            >
              Trusted by Industry Leaders
            </motion.h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                name: 'Sarah Mitchell',
                role: 'Security Manager',
                company: 'Tech Corp Inc.',
                content: 'CyberAwareSim transformed our security culture. Our phishing click rates dropped by 65% in just 6 months.',
                avatar: '👩‍💼',
              },
              {
                name: 'James Chen',
                role: 'IT Director',
                company: 'Financial Services LLC',
                content: 'The interactive simulations are incredibly effective. Employees now take security seriously and actively report suspicious emails.',
                avatar: '👨‍💼',
              },
              {
                name: 'Lisa Anderson',
                role: 'Compliance Officer',
                company: 'Healthcare Solutions',
                content: 'Outstanding platform for compliance training. The detailed analytics help us meet audit requirements effortlessly.',
                avatar: '👩‍⚕️',
              },
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={hoverVariants.hover}
                className="p-8 rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-purple-500/10 hover:border-purple-500/30"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className="text-gray-300 mb-6 italic">"{testimonial.content}"</p>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role} at {testimonial.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-black" id="pricing">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-6"
            >
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Flexible Pricing Plans</span>
            </motion.div>

            <motion.h2
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold font-poppins mb-6"
            >
              Choose Your Plan
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-400 max-w-2xl mx-auto"
            >
              Start free and scale as your organization grows. No credit card required.
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                name: 'Starter',
                price: '$99',
                period: '/month',
                description: 'Perfect for small organizations',
                features: [
                  'Up to 50 employees',
                  'Phishing simulations only',
                  'Basic analytics',
                  'Email support',
                  'Monthly reports',
                ],
              },
              {
                name: 'Professional',
                price: '$499',
                period: '/month',
                description: 'Most popular for growing teams',
                features: [
                  'Up to 500 employees',
                  'All simulation types',
                  'Real-time analytics',
                  'Custom training modules',
                  'Priority support',
                  'Department leaderboards',
                  'API access',
                ],
                highlighted: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                description: 'For large organizations',
                features: [
                  'Unlimited employees',
                  'Advanced features',
                  'Dedicated account manager',
                  'Custom integrations',
                  '24/7 phone support',
                  'White-label options',
                  'SLA guarantee',
                ],
              },
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={plan.highlighted ? { scale: 1.05 } : { scale: 1.02 }}
                className={`relative p-8 rounded-2xl transition-all ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500 ring-2 ring-purple-500/20'
                    : 'bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-purple-500/10'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold font-poppins mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                <div className="mb-8">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-gray-400 text-sm">{plan.period}</span>}
                </div>

                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-all mb-8 ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                      : 'border border-purple-500/30 text-white hover:bg-purple-500/10'
                  }`}
                >
                  Get Started
                </button>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-purple-600/10 via-black to-blue-600/10 border-y border-purple-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold font-poppins mb-6"
            >
              Start Protecting Your Organization Today
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto"
            >
              Join hundreds of companies training their employees against cyber threats. Get started with a free
              trial—no credit card required.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/register">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-6 text-base rounded-lg">
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-purple-500/30 text-white hover:bg-purple-500/10 px-8 py-6 text-base rounded-lg"
              >
                Schedule a Demo
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-500/10 bg-black py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-5 gap-8 mb-12"
          >
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-purple-400" />
                <span className="font-bold">CyberAwareSim</span>
              </div>
              <p className="text-gray-400 text-sm">Protecting organizations from social engineering threats.</p>
            </motion.div>

            <motion.div variants={itemVariants}>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#howitworks" className="hover:text-white transition">How It Works</a></li>
              </ul>
            </motion.div>

            <motion.div variants={itemVariants}>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#about" className="hover:text-white transition">About</a></li>
                <li><a href="#contact" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
              </ul>
            </motion.div>

            <motion.div variants={itemVariants}>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">API Docs</a></li>
                <li><a href="#" className="hover:text-white transition">Support</a></li>
              </ul>
            </motion.div>

            <motion.div variants={itemVariants}>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </motion.div>
          </motion.div>

          {/* Newsletter */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="border-t border-purple-500/10 pt-8 mb-8"
          >
            <motion.div variants={itemVariants} className="max-w-md">
              <h4 className="font-semibold mb-3">Stay Updated</h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 bg-slate-900/50 border border-purple-500/20 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-blue-700 transition">
                  Subscribe
                </button>
              </div>
            </motion.div>
          </motion.div>

          {/* Bottom */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="border-t border-purple-500/10 pt-8 flex flex-col md:flex-row items-center justify-between"
          >
            <motion.p variants={itemVariants} className="text-gray-400 text-sm">
              &copy; 2024 CyberAwareSim. All rights reserved.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex gap-4 mt-6 md:mt-0"
            >
              {[
                { icon: Github, href: '#' },
                { icon: Linkedin, href: '#' },
                { icon: Twitter, href: '#' },
              ].map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-gray-400 hover:text-purple-400 hover:bg-purple-500/20 transition"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
