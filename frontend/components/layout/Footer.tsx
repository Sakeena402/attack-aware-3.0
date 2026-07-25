// components/layout/Footer.tsx
'use client';

import { motion } from 'framer-motion';
import { Shield, Github, Linkedin, Twitter } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function Footer() {
  return (
    <footer className="border-t border-purple-500/10 bg-background py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-5 gap-8 mb-12">
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-purple-500" />
              <span className="font-bold text-foreground">AttackAware</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Protecting organizations from social engineering threats.
            </p>
          </motion.div>

          {[
            { title: 'Product', links: [{ label: 'Features', href: '/#features' }, { label: 'Pricing', href: '/pricing' }, { label: 'How It Works', href: '/#howitworks' }] },
            { title: 'Company', links: [{ label: 'About', href: '/#about' }, { label: 'Contact', href: '/#contact' }, { label: 'Blog', href: '#' }] },
            { title: 'Resources', links: [{ label: 'Documentation', href: '#' }, { label: 'API Docs', href: '#' }, { label: 'Support', href: '#' }] },
            { title: 'Legal', links: [{ label: 'Privacy', href: '#' }, { label: 'Terms', href: '#' }, { label: 'Security', href: '#' }] },
          ].map((col) => (
            <motion.div key={col.title} variants={itemVariants}>
              <h4 className="font-semibold mb-4 text-foreground text-sm">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        <div className="border-t border-purple-500/10 pt-8 mb-8">
          <div className="max-w-md">
            <h4 className="font-semibold mb-3 text-foreground text-sm">Stay Updated</h4>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-muted soft-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30"
              />
              <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm font-semibold transition">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-purple-500/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">&copy; 2024 AttackAware. All rights reserved.</p>
          <div className="flex gap-3">
            {[Github, Linkedin, Twitter].map((Icon, idx) => (
              <a key={idx} href="#" className="w-9 h-9 rounded-lg bg-muted soft-border flex items-center justify-center text-muted-foreground hover:text-purple-500 hover:border-purple-400/50 transition">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}