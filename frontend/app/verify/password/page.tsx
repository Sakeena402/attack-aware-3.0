'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, Lock, AlertTriangle, CheckCircle } from 'lucide-react';

export default function PasswordResetPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCaught, setShowCaught] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const campaignId = searchParams.get('c') || '';
      const userId = searchParams.get('u') || '';

      await fetch('/api/track/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          campaignId,
          userId,
          email: '[REDACTED]',
          currentPassword: '[REDACTED]',
          newPassword: '[REDACTED]',
        }),
      });

      setShowCaught(true);
    } catch {
      setShowCaught(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReport = async () => {
    try {
      const campaignId = searchParams.get('c') || '';
      const userId = searchParams.get('u') || '';

      await fetch('/api/track/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, campaignId, userId, method: 'button' }),
      });

      router.push('/verify/reported');
    } catch {
      router.push('/verify/reported');
    }
  };

  if (showCaught) {
    return <CaughtPage onClose={() => router.push('/dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Fake email provider header */}
      <header className="bg-gray-800 py-4 px-6 border-b border-gray-700">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-blue-400" />
            <span className="text-white text-xl font-bold">SecureMail</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Lock className="w-4 h-4" />
            <span>Account Security</span>
          </div>
        </div>
      </header>

      {/* Warning banner */}
      <div className="bg-yellow-500 text-gray-900 py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">
            <strong>Security Notice:</strong> A password reset was requested for your account. If this was not you, secure your account immediately.
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-md mx-auto mt-10 px-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h1 className="text-white text-xl font-semibold">Secure Your Account</h1>
            <p className="text-blue-200 text-sm mt-1">Reset your password to protect your account</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter current password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter new password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm new password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Securing...' : 'Reset Password'}
            </button>
          </form>

          <div className="px-6 pb-6">
            <button
              onClick={handleReport}
              className="w-full text-sm text-red-400 hover:text-red-300 underline"
            >
              I did not request this - Report as suspicious
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function CaughtPage({ onClose }: { onClose: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            You Fell for a Phishing Scam
          </h1>
          
          <p className="text-gray-600 text-lg mb-8">
            You just entered your email credentials on a fake password reset page. 
            An attacker would now have full access to your email account.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-red-800 mb-3">Red Flags You Missed:</h2>
            <ul className="space-y-2 text-red-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">1.</span>
                <span>Password reset links from SMS are almost always fraudulent</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">2.</span>
                <span>Legitimate services never ask for your current password in reset forms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">3.</span>
                <span>The domain was not the official email provider</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">4.</span>
                <span>The message implied your account was compromised to create urgency</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-green-800 mb-3">Password Security Tips:</h2>
            <ul className="space-y-2 text-green-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Only reset passwords through official websites you navigate to directly</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Enable two-factor authentication on all accounts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Use a password manager to generate unique passwords</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Never reuse passwords across different accounts</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
