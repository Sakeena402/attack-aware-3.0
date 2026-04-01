'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, AlertTriangle, Lock, CheckCircle } from 'lucide-react';

export default function BankVerificationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    accountNumber: '',
    routingNumber: '',
    ssn: '',
    pin: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCaught, setShowCaught] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get campaign and user IDs from URL params or session
      const campaignId = searchParams.get('c') || '';
      const userId = searchParams.get('u') || '';

      const response = await fetch('/api/track/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          campaignId,
          userId,
          // Only send field names, not actual values
          accountNumber: '[REDACTED]',
          routingNumber: '[REDACTED]',
          ssn: '[REDACTED]',
          pin: '[REDACTED]',
        }),
      });

      if (response.ok) {
        setShowCaught(true);
      }
    } catch (error) {
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
        body: JSON.stringify({
          token,
          campaignId,
          userId,
          method: 'button',
        }),
      });

      router.push('/verify/reported');
    } catch (error) {
      router.push('/verify/reported');
    }
  };

  if (showCaught) {
    return <CaughtPage onClose={() => router.push('/dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800">
      {/* Fake bank header */}
      <header className="bg-blue-950 py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-950" />
            </div>
            <span className="text-white text-xl font-bold">SecureBank Online</span>
          </div>
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <Lock className="w-4 h-4" />
            <span>256-bit SSL Encrypted</span>
          </div>
        </div>
      </header>

      {/* Alert banner */}
      <div className="bg-red-600 text-white py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">
            <strong>Security Alert:</strong> Unusual activity detected. Verify your identity to prevent account suspension.
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-md mx-auto mt-10 px-4">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-blue-800 px-6 py-4">
            <h1 className="text-white text-xl font-semibold">Account Verification Required</h1>
            <p className="text-blue-200 text-sm mt-1">Please verify your account details to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your account number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Routing Number
              </label>
              <input
                type="text"
                value={formData.routingNumber}
                onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your routing number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last 4 digits of SSN
              </label>
              <input
                type="password"
                maxLength={4}
                value={formData.ssn}
                onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="****"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your PIN"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Verify Account'}
            </button>
          </form>

          <div className="px-6 pb-6">
            <button
              onClick={handleReport}
              className="w-full text-sm text-red-600 hover:text-red-700 underline"
            >
              Report this as suspicious
            </button>
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          SecureBank Online Banking - All rights reserved
        </p>
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
            This Was a Phishing Simulation
          </h1>
          
          <p className="text-gray-600 text-lg mb-8">
            You just submitted sensitive information to a fake banking website. 
            In a real attack, your account could have been compromised.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-red-800 mb-3">Red Flags You Missed:</h2>
            <ul className="space-y-2 text-red-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">1.</span>
                <span>The URL was not the official bank website domain</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">2.</span>
                <span>Legitimate banks never ask for your full SSN or PIN via SMS links</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">3.</span>
                <span>The message created urgency to bypass your critical thinking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">4.</span>
                <span>You received an unsolicited message about account issues</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-green-800 mb-3">What to Do Next Time:</h2>
            <ul className="space-y-2 text-green-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Never click links in unexpected SMS messages</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Call your bank directly using the number on your card</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Check the URL carefully before entering any information</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Report suspicious messages to your IT security team</span>
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
