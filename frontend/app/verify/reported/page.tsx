'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Star, Trophy, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

export default function ReportedPage() {
  const router = useRouter();
  const { width, height } = useWindowSize();

  const [points, setPoints] = useState(0);

  // animated counter
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 5;
      setPoints(i);
      if (i >= 50) clearInterval(interval);
    }, 25);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-b from-green-500 to-emerald-600 flex items-center justify-center p-4"
    >
      {/* 🎉 Confetti */}
      <Confetti width={width} height={height} numberOfPieces={150} />

      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">

        <div className="text-center">

          {/* Trophy */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Trophy className="w-12 h-12 text-green-600" />
          </motion.div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Excellent Work!
          </h1>

          <p className="text-xl text-green-600 font-semibold mb-6">
            You correctly identified a phishing attempt
          </p>

          {/* Points Card */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-xl p-6 mb-8 cursor-pointer"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Star className="w-6 h-6" />
              <span className="text-2xl font-bold">
                +{points} Points Earned!
              </span>
              <Star className="w-6 h-6" />
            </div>

            <p className="text-sm opacity-90">
              Your security awareness is improving your organization’s safety
            </p>
          </motion.div>

          {/* Badges */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {['Phish Spotter', 'Security Eye', 'Risk Detector'].map((badge) => (
              <div
                key={badge}
                className="bg-green-50 border border-green-200 rounded-lg p-3 text-center text-sm font-medium text-green-700"
              >
                🏅 {badge}
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Why This Was Suspicious:
            </h2>

            <ul className="space-y-2 text-blue-700">
              {[
                'The message arrived via SMS from an unknown number',
                'It requested sensitive personal information',
                'The URL was not from an official domain',
                'The message created false urgency'
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Reminder */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-800 mb-3">
              Remember:
            </h3>
            <p className="text-gray-600">
              Always verify unexpected requests through official channels.
              Never trust urgent messages asking for sensitive data.
            </p>
          </div>

          {/* Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/dashboard')}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Return to Dashboard
          </motion.button>

        </div>
      </div>
    </motion.div>
  );
}