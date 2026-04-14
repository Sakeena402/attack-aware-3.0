'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Monitor, Shield, AlertTriangle, CheckCircle, Lock, Server } from 'lucide-react';

function ITSupportVerificationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    employeeId: '',
    username: '',
    password: '',
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
          employeeId: '[REDACTED]',
          username: '[REDACTED]',
          password: '[REDACTED]',
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
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded flex items-center justify-center">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-white text-lg font-bold block">Corporate IT Services</span>
              <span className="text-slate-400 text-xs">Security Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-cyan-400 text-sm">
            <Shield className="w-4 h-4" />
            <span>Secure Connection</span>
          </div>
        </div>
      </header>

      <div className="bg-red-600 text-white py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />
          <p className="text-sm">
            <strong>CRITICAL:</strong> Your account has been flagged for suspicious login attempts. Immediate verification required.
          </p>
        </div>
      </div>

      <main className="max-w-md mx-auto mt-10 px-4">
        <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-white text-xl font-semibold">Security Verification</h1>
                <p className="text-cyan-100 text-sm">Verify your credentials to restore access</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 text-yellow-400 text-sm mb-2">
                <Monitor className="w-4 h-4" />
                <span>Device Detected: Windows 11 - Chrome Browser</span>
              </div>
              <p className="text-slate-400 text-xs">
                IP: 192.168.1.***  |  Location: Unknown
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Employee ID</label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Enter your employee ID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Network Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="your.username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Enter your password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Re-enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Verify & Secure Account'}
            </button>
          </form>

          <div className="px-6 pb-6">
            <button onClick={handleReport} className="w-full text-sm text-red-400 hover:text-red-300 underline">
              This looks suspicious - Report it
            </button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Corporate IT Services - Internal Use Only
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
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">This Was a Phishing Simulation</h1>
          
          <p className="text-gray-600 text-lg mb-8">
            You just submitted your corporate credentials to a fake IT support page.
            In a real attack, hackers could access your company network and data.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-red-800 mb-3">Red Flags You Missed:</h2>
            <ul className="space-y-2 text-red-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">1.</span>
                <span>IT departments never ask for passwords via SMS or email links</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">2.</span>
                <span>The URL was not your company&apos;s official IT portal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">3.</span>
                <span>Creating urgency about &quot;suspicious activity&quot; is a common tactic</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">4.</span>
                <span>Legitimate IT requests come through official company channels</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-green-800 mb-3">What to Do Next Time:</h2>
            <ul className="space-y-2 text-green-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Contact IT directly through your company directory</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Never enter credentials on pages from links in messages</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Type IT portal URLs directly into your browser</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Report suspicious messages to your security team</span>
              </li>
            </ul>
          </div>

          <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg">
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ITSupportVerificationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ITSupportVerificationContent />
    </Suspense>
  );
}
