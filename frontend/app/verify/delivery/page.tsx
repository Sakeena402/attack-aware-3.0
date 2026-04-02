'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Package, MapPin, AlertTriangle, CheckCircle, Truck } from 'lucide-react';

export default function DeliveryVerificationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    creditCard: '',
    expiry: '',
    cvv: '',
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
          fullName: '[REDACTED]',
          address: '[REDACTED]',
          creditCard: '[REDACTED]',
          cvv: '[REDACTED]',
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
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-600 py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-white text-xl font-bold">QuickShip Express</span>
          </div>
          <div className="flex items-center gap-2 text-amber-100 text-sm">
            <Truck className="w-4 h-4" />
            <span>Track #: QS-8847291</span>
          </div>
        </div>
      </header>

      <div className="bg-red-500 text-white py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">
            <strong>Delivery Failed:</strong> Address verification required. Package will be returned in 24 hours.
          </p>
        </div>
      </div>

      <main className="max-w-lg mx-auto mt-10 px-4">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-amber-500 px-6 py-4">
            <h1 className="text-white text-xl font-semibold">Confirm Delivery Address</h1>
            <p className="text-amber-100 text-sm mt-1">Small redelivery fee required: $1.99</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-4">Payment for redelivery fee</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                  <input
                    type="text"
                    value={formData.creditCard}
                    onChange={(e) => setFormData({ ...formData, creditCard: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                    placeholder="1234 5678 9012 3456"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                    <input
                      type="text"
                      value={formData.expiry}
                      onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                      placeholder="MM/YY"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={formData.cvv}
                      onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                      placeholder="***"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Confirm & Pay $1.99'}
            </button>
          </form>

          <div className="px-6 pb-6">
            <button onClick={handleReport} className="w-full text-sm text-red-600 hover:text-red-700 underline">
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
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">This Was a Smishing Simulation</h1>
          
          <p className="text-gray-600 text-lg mb-8">
            You just provided personal and payment information to a fake delivery website.
            In a real attack, your credit card and identity could have been stolen.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-red-800 mb-3">Red Flags You Missed:</h2>
            <ul className="space-y-2 text-red-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">1.</span>
                <span>Legitimate delivery companies do not ask for redelivery fees via SMS</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">2.</span>
                <span>The URL was not from a recognized delivery service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">3.</span>
                <span>Urgency tactics (24-hour deadline) are common in scams</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">4.</span>
                <span>Small fees are used to make you think it is low risk</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-green-800 mb-3">What to Do Next Time:</h2>
            <ul className="space-y-2 text-green-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Check the official website or app of the delivery service</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Never pay fees through links in text messages</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Call the delivery company directly using a verified number</span>
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
