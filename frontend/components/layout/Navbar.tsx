// components/layout/Navbar.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Shield, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '/#home' },
    { label: 'Features', href: '/#features' },
    { label: 'How It Works', href: '/#howitworks' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'About', href: '/#about' },
    { label: 'Contact', href: '/#contact' },
  ];

  return (
    <motion.nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-purple-500/10' : 'bg-transparent'
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.05 }}>
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold font-poppins bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              AttackAware
            </span>
          </Link>
        </motion.div>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Login</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
              Get Started
            </Button>
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button className="text-muted-foreground hover:text-foreground p-1" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <motion.div
        className="md:hidden bg-background/95 backdrop-blur-xl border-b border-purple-500/10 overflow-hidden"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: mobileMenuOpen ? 1 : 0, height: mobileMenuOpen ? 'auto' : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="block text-muted-foreground hover:text-foreground transition-colors py-2 text-sm" onClick={() => setMobileMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <div className="pt-4 border-t border-purple-500/10 space-y-2">
            <Link href="/login" className="block">
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">Login</Button>
            </Link>
            <Link href="/register" className="block">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">Get Started</Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.nav>
  );
}