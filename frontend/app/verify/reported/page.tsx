'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle, Star, Trophy, Shield } from 'lucide-react';

export default function ReportedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-emerald-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Excellent Work!
          </h1>
          
          <p className="text-xl text-green-600 font-semibold mb-6">
            You correctly identified a phishing attempt
          </p>

          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Star className="w-6 h-6" />
              <span className="text-2xl font-bold">+50 Points Earned!</span>
              <Star className="w-6 h-6" />
            </div>
            <p className="text-sm opacity-90">
              Your security awareness is helping protect your organization
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Why This Was Suspicious:
            </h2>
            <ul className="space-y-2 text-blue-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>The message arrived via SMS from an unknown number</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>It requested sensitive personal information</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>The URL was not from an official domain</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>The message created a false sense of urgency</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-800 mb-3">Remember:</h3>
            <p className="text-gray-600">
              Always verify unexpected requests through official channels. When in doubt, 
              contact your IT security team or the organization directly using known contact information.
            </p>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
