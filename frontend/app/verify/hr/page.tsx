'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building2, AlertCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

function HRBenefitsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    employeeId: '',
    ssn: '',
    dateOfBirth: '',
    bankAccount: '',
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
          ssn: '[REDACTED]',
          dateOfBirth: '[REDACTED]',
          bankAccount: '[REDACTED]',
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
    <div className="min-h-screen bg-gray-100">
      {/* Fake HR portal header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-600" />
            <div>
              <span className="text-xl font-bold text-gray-900">Employee Portal</span>
              <span className="block text-xs text-gray-500">Benefits Administration</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-orange-600 text-sm font-medium">
            <Clock className="w-4 h-4" />
            <span>Deadline: Today</span>
          </div>
        </div>
      </header>

      {/* Urgent banner */}
      <div className="bg-orange-500 text-white py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">
            <strong>Action Required:</strong> Your benefits enrollment expires today. Update your information to maintain coverage.
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-lg mx-auto mt-10 px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4">
            <h1 className="text-white text-xl font-semibold">Benefits Enrollment Update</h1>
            <p className="text-indigo-200 text-sm mt-1">Verify your information for 2024 benefits</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                Please verify your personal information to continue receiving your current benefits package.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your employee ID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Social Security Number
              </label>
              <input
                type="password"
                value={formData.ssn}
                onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="XXX-XX-XXXX"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account (for direct deposit)
              </label>
              <input
                type="text"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter account number"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Benefits Information'}
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
            This Was a Smishing Simulation
          </h1>
          
          <p className="text-gray-600 text-lg mb-8">
            You submitted personal information to a fake HR portal. 
            Attackers often impersonate HR to steal employee data.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-red-800 mb-3">Red Flags You Missed:</h2>
            <ul className="space-y-2 text-red-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">1.</span>
                <span>The link came via SMS, not through official company channels</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">2.</span>
                <span>HR never asks for your full SSN via web forms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">3.</span>
                <span>False urgency: &quot;Expires today&quot; is a pressure tactic</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">4.</span>
                <span>The URL was not your company&apos;s official HR portal</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-green-800 mb-3">Best Practices:</h2>
            <ul className="space-y-2 text-green-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Always access HR portals by typing the URL directly</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Verify benefits requests with your HR department directly</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Be suspicious of any request for SSN or bank details</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Report suspicious messages to IT security immediately</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HRBenefitsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HRBenefitsContent />
    </Suspense>
  );
}
