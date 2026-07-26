'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { TRACKING_API_BASE } from '@/lib/trackingApi';

export default function CaughtPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center p-4">

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={visible ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
      >

        {/* Icon with pulse */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5"
        >
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </motion.div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Security Simulation Triggered
        </h1>

        <p className="text-gray-600 mb-6">
          You interacted with a simulated phishing page. In a real attack,
          your credentials would be compromised.
        </p>

        {/* Alert Box */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-6">
          <p className="text-sm font-semibold text-red-700 mb-2">
            What this teaches you:
          </p>

          <ul className="text-sm text-red-600 space-y-2">
            {[
              'Never trust unexpected login pages from links',
              'Always verify domain before entering credentials',
              'Report suspicious messages immediately'
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 text-red-500">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Positive reinforcement */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left mb-6">
          <p className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            What you should do next time:
          </p>

          <ul className="text-sm text-green-700 space-y-2">
            {[
              'Go directly to official website',
              'Check sender identity carefully',
              'Report suspicious activity'
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all w-full"
        >
          Back to Dashboard
        </motion.button>

      </motion.div>
    </div>
  );
}