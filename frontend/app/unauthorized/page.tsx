'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Lock, Home, ArrowRight } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 cyber-grid">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10 max-w-md px-6"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-6 flex justify-center"
        >
          <div className="p-4 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/50">
            <Lock className="w-12 h-12 text-red-400" />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-4 mb-8">
          <h1 className="text-4xl font-bold text-foreground">Access Denied</h1>
          <p className="text-slate-400 text-lg">
            You don't have permission to access this resource. Your current role doesn't grant access to this area.
          </p>
        </motion.div>

        {/* Role info */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mb-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <p className="text-sm text-slate-400 mb-2">If you believe this is a mistake, please contact your administrator or try:</p>
          <ul className="text-xs text-slate-300 space-y-1 text-left">
            <li>- Ensure you're logged in with the correct account</li>
            <li>- Check with your company admin about your role</li>
            <li>- Log out and log in again to refresh permissions</li>
          </ul>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25"
          >
            <Home size={18} />
            Return to Dashboard
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/logout"
            className="px-6 py-3 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-foreground font-semibold transition-all"
          >
            Log Out
          </Link>
        </motion.div>

        {/* Support text */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-xs text-slate-500 mt-8">
          Need help? Contact support at support@attackaware.com
        </motion.p>
      </motion.div>
    </div>
  );
}
