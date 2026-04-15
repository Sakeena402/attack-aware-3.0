// // frontend/app/verify/[pageType]/page.tsx
// 'use client';

// import { useState } from 'react';
// import { useParams, useSearchParams } from 'next/navigation';

// const pageConfigs: Record<string, {
//   title: string;
//   logo: string;
//   fields: { name: string; label: string; type: string; placeholder: string }[];
//   buttonText: string;
//   headerColor: string;
// }> = {
//   bank: {
//     title: 'Secure Banking Verification',
//     logo: '🏦',
//     headerColor: 'bg-blue-700',
//     buttonText: 'Verify My Account',
//     fields: [
//       { name: 'accountNumber', label: 'Account Number', type: 'text',     placeholder: 'Enter account number' },
//       { name: 'password',      label: 'Online Banking Password', type: 'password', placeholder: 'Enter password' },
//       { name: 'pin',           label: 'ATM PIN',      type: 'password', placeholder: 'Enter 4-digit PIN' },
//     ],
//   },
//   bank_alert: {
//     title: 'Secure Banking Verification',
//     logo: '🏦',
//     headerColor: 'bg-blue-700',
//     buttonText: 'Verify My Account',
//     fields: [
//       { name: 'accountNumber', label: 'Account Number', type: 'text',     placeholder: 'Enter account number' },
//       { name: 'password',      label: 'Online Banking Password', type: 'password', placeholder: 'Enter password' },
//       { name: 'pin',           label: 'ATM PIN',      type: 'password', placeholder: 'Enter 4-digit PIN' },
//     ],
//   },
//   package_delivery: {
//     title: 'Confirm Your Delivery Address',
//     logo: '📦',
//     headerColor: 'bg-orange-600',
//     buttonText: 'Confirm & Re-deliver',
//     fields: [
//       { name: 'fullName', label: 'Full Name',      type: 'text',     placeholder: 'Enter your full name' },
//       { name: 'address',  label: 'Street Address', type: 'text',     placeholder: 'Enter your address' },
//       { name: 'phone',    label: 'Phone Number',   type: 'tel',      placeholder: 'Enter phone number' },
//     ],
//   },
//   hr_benefits: {
//     title: 'HR Benefits Portal — Action Required',
//     logo: '🏢',
//     headerColor: 'bg-green-700',
//     buttonText: 'Update My Benefits',
//     fields: [
//       { name: 'employeeId', label: 'Employee ID',       type: 'text',     placeholder: 'Enter employee ID' },
//       { name: 'password',   label: 'HR Portal Password', type: 'password', placeholder: 'Enter password' },
//       { name: 'ssn',        label: 'Last 4 of SSN',     type: 'text',     placeholder: 'XXXX' },
//     ],
//   },
//   password_reset: {
//     title: 'Account Security — Verify Identity',
//     logo: '🔒',
//     headerColor: 'bg-gray-700',
//     buttonText: 'Secure My Account',
//     fields: [
//       { name: 'email',       label: 'Email Address',   type: 'email',    placeholder: 'Enter your email' },
//       { name: 'oldPassword', label: 'Current Password', type: 'password', placeholder: 'Enter current password' },
//       { name: 'newPassword', label: 'New Password',     type: 'password', placeholder: 'Choose new password' },
//     ],
//   },
//   prize_winner: {
//     title: '🎉 Claim Your $500 Gift Card',
//     logo: '🎁',
//     headerColor: 'bg-purple-600',
//     buttonText: 'Claim My Prize',
//     fields: [
//       { name: 'fullName',    label: 'Full Name',    type: 'text',  placeholder: 'Enter full name' },
//       { name: 'email',       label: 'Email',        type: 'email', placeholder: 'Enter email' },
//       { name: 'creditCard',  label: 'Credit Card (for shipping)', type: 'text', placeholder: 'XXXX-XXXX-XXXX-XXXX' },
//     ],
//   },
//   tax_refund: {
//     title: 'IRS Tax Refund — Verify Identity',
//     logo: '🏛️',
//     headerColor: 'bg-blue-900',
//     buttonText: 'Claim My Refund',
//     fields: [
//       { name: 'ssn',      label: 'Social Security Number', type: 'text',    placeholder: 'XXX-XX-XXXX' },
//       { name: 'bankAccount', label: 'Bank Account for Deposit', type: 'text', placeholder: 'Account number' },
//       { name: 'routing',  label: 'Routing Number',          type: 'text',    placeholder: 'Routing number' },
//     ],
//   },
// };

// export default function VerifyPage() {
//   const params       = useParams();
//   const searchParams = useSearchParams();

//   const pageType = params.pageType as string;
//   const token    = searchParams.get('token') ?? '';

//   // Extract campaignId and userId from token if embedded, or from query params
//   const campaignId = searchParams.get('c') ?? '';
//   const userId     = searchParams.get('u') ?? '';

// // const campaignId =
// //   searchParams.get('c') ||
// //   searchParams.get('campaignId') ||
// //   '';

// // const userId =
// //   searchParams.get('u') ||
// //   searchParams.get('userId') ||
// //   '';

//   const config = pageConfigs[pageType] ?? pageConfigs.bank;

//   const [formValues,  setFormValues]  = useState<Record<string, string>>({});
//   const [submitted,   setSubmitted]   = useState(false);
//   const [caught,      setCaught]      = useState(false);
//   const [isSubmitting,setIsSubmitting]= useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);

//     try {
//         console.log("TRACK SUBMIT DEBUG:", {
//                 token,
//                 campaignId,
//                 userId,
//                 formValues
//                 });

//       // Report to backend tracking endpoint
//       const res = await fetch(
//         `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/track/submit`,
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             token,
//             campaignId,
//             userId,
//             ...formValues,
//           }),
//         }
//       );

//       // Whether tracking succeeded or not, show caught page
//       setCaught(true);
//     } catch {
//       setCaught(true); // Still show caught page
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleReport = async () => {
//     try {
//       await fetch(
//         `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/track/report`,
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ token, campaignId, userId }),
//         }
//       );
//     } catch {}
//     setSubmitted(true);
//   };

//   // ── CAUGHT PAGE (after submitting credentials) ─────────────────────────────
//   if (caught) {
//     return (
//       <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
//         <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
//           <div className="text-6xl mb-4">⚠️</div>
//           <h1 className="text-2xl font-bold text-red-600 mb-3">
//             This was a Security Simulation
//           </h1>
//           <p className="text-gray-600 mb-4">
//             You just submitted information to a fake page. In a real attack, your credentials would now be compromised.
//           </p>
//           <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
//             <p className="text-sm font-semibold text-red-700 mb-2">What you should have done:</p>
//             <ul className="text-sm text-red-600 space-y-1">
//               <li>✗ Never click links in unexpected SMS messages</li>
//               <li>✓ Go directly to the official website instead</li>
//               <li>✓ Report suspicious messages to IT security</li>
//             </ul>
//           </div>
//           <p className="text-sm text-gray-500">
//             Your response has been recorded. Check your dashboard to see your security score.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // ── REPORTED PAGE (after clicking "report" button) ─────────────────────────
//   if (submitted) {
//     return (
//       <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
//         <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
//           <div className="text-6xl mb-4">🛡️</div>
//           <h1 className="text-2xl font-bold text-green-600 mb-3">
//             Great Job! You Identified a Phishing Attempt
//           </h1>
//           <p className="text-gray-600 mb-4">
//             This was a security awareness simulation and you correctly reported it as suspicious.
//           </p>
//           <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
//             <p className="text-2xl font-bold text-green-600">+50 Points Earned! 🎉</p>
//             <p className="text-sm text-green-700 mt-1">Your security awareness score has improved</p>
//           </div>
//           <p className="text-sm text-gray-500">
//             Check your dashboard to see your updated rank on the leaderboard.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // ── FAKE PHISHING PAGE ─────────────────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
//       <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
//         {/* Header */}
//         <div className={`${config.headerColor} text-white p-6 text-center`}>
//           <div className="text-4xl mb-2">{config.logo}</div>
//           <h1 className="text-xl font-bold">{config.title}</h1>
//         </div>

//         {/* Report button — subtle, in the corner */}
//         <div className="flex justify-end px-4 pt-3">
//           <button
//             onClick={handleReport}
//             className="text-xs text-gray-400 hover:text-gray-600 underline"
//           >
//             Report as suspicious
//           </button>
//         </div>

//         {/* Form */}
//         <form onSubmit={handleSubmit} className="p-6 space-y-4">
//           <p className="text-sm text-gray-600 text-center mb-4">
//             Please verify your information to continue
//           </p>

//           {config.fields.map(field => (
//             <div key={field.name}>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 {field.label}
//               </label>
//               <input
//                 type={field.type}
//                 placeholder={field.placeholder}
//                 value={formValues[field.name] ?? ''}
//                 onChange={e => setFormValues(prev => ({ ...prev, [field.name]: e.target.value }))}
//                 className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//           ))}

//           <button
//             type="submit"
//             disabled={isSubmitting}
//             className={`w-full py-3 rounded-lg text-white font-semibold text-sm transition ${config.headerColor} hover:opacity-90 disabled:opacity-60`}
//           >
//             {isSubmitting ? 'Please wait...' : config.buttonText}
//           </button>

//           <p className="text-xs text-center text-gray-400 mt-2">
//             🔒 Secured with 256-bit SSL encryption
//           </p>
//         </form>
//       </div>
//     </div>
//   );
// }


// frontend/app/verify/[pageType]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const pageConfigs: Record<string, {
  title: string;
  logo: string;
  headerColor: string;
  buttonText: string;
  fields: { name: string; label: string; type: string; placeholder: string }[];
}> = {
  bank: {
    title: 'Secure Banking Verification',
    logo: '🏦',
    headerColor: 'bg-blue-700',
    buttonText: 'Verify My Account',
    fields: [
      { name: 'accountNumber', label: 'Account Number',          type: 'text',     placeholder: 'Enter account number' },
      { name: 'password',      label: 'Online Banking Password', type: 'password', placeholder: 'Enter password' },
      { name: 'pin',           label: 'ATM PIN',                 type: 'password', placeholder: '4-digit PIN' },
    ],
  },
  bank_alert: {
    title: 'Secure Banking Verification',
    logo: '🏦',
    headerColor: 'bg-blue-700',
    buttonText: 'Verify My Account',
    fields: [
      { name: 'accountNumber', label: 'Account Number',          type: 'text',     placeholder: 'Enter account number' },
      { name: 'password',      label: 'Online Banking Password', type: 'password', placeholder: 'Enter password' },
      { name: 'pin',           label: 'ATM PIN',                 type: 'password', placeholder: '4-digit PIN' },
    ],
  },
  package_delivery: {
    title: 'Confirm Your Delivery',
    logo: '📦',
    headerColor: 'bg-orange-600',
    buttonText: 'Confirm & Re-deliver',
    fields: [
      { name: 'fullName', label: 'Full Name',      type: 'text', placeholder: 'Enter full name' },
      { name: 'address',  label: 'Street Address', type: 'text', placeholder: 'Enter address' },
      { name: 'phone',    label: 'Phone Number',   type: 'tel',  placeholder: 'Enter phone' },
    ],
  },
  hr_benefits: {
    title: 'HR Benefits Portal — Action Required',
    logo: '🏢',
    headerColor: 'bg-green-700',
    buttonText: 'Update My Benefits',
    fields: [
      { name: 'employeeId', label: 'Employee ID',         type: 'text',     placeholder: 'Enter employee ID' },
      { name: 'password',   label: 'HR Portal Password',  type: 'password', placeholder: 'Enter password' },
      { name: 'ssn',        label: 'Last 4 of SSN',       type: 'text',     placeholder: 'XXXX' },
    ],
  },
  password_reset: {
    title: 'Account Security — Verify Identity',
    logo: '🔒',
    headerColor: 'bg-gray-700',
    buttonText: 'Secure My Account',
    fields: [
      { name: 'email',       label: 'Email Address',    type: 'email',    placeholder: 'Enter email' },
      { name: 'oldPassword', label: 'Current Password', type: 'password', placeholder: 'Current password' },
      { name: 'newPassword', label: 'New Password',     type: 'password', placeholder: 'New password' },
    ],
  },
  prize_winner: {
    title: '🎉 Claim Your $500 Gift Card',
    logo: '🎁',
    headerColor: 'bg-purple-600',
    buttonText: 'Claim My Prize',
    fields: [
      { name: 'fullName',   label: 'Full Name',                   type: 'text',  placeholder: 'Enter full name' },
      { name: 'email',      label: 'Email',                       type: 'email', placeholder: 'Enter email' },
      { name: 'creditCard', label: 'Credit Card (for shipping)',   type: 'text',  placeholder: 'XXXX-XXXX-XXXX-XXXX' },
    ],
  },
  tax_refund: {
    title: 'IRS Tax Refund — Verify Identity',
    logo: '🏛️',
    headerColor: 'bg-blue-900',
    buttonText: 'Claim My Refund',
    fields: [
      { name: 'ssn',         label: 'Social Security Number',    type: 'text', placeholder: 'XXX-XX-XXXX' },
      { name: 'bankAccount', label: 'Bank Account for Deposit',  type: 'text', placeholder: 'Account number' },
      { name: 'routing',     label: 'Routing Number',            type: 'text', placeholder: 'Routing number' },
    ],
  },
};

type PageState = 'form' | 'caught' | 'reported';

export default function VerifyPage() {
  const params       = useParams();
  const searchParams = useSearchParams();

  const pageType   = params.pageType as string;
  const token      = searchParams.get('token') ?? '';
  const campaignId = searchParams.get('c') ?? '';   // ← passed from tracking redirect
  const userId     = searchParams.get('u') ?? '';   // ← passed from tracking redirect

  const config = pageConfigs[pageType] ?? pageConfigs.bank;

  const [formValues,   setFormValues]   = useState<Record<string, string>>({});
  const [pageState,    setPageState]    = useState<PageState>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Submit fake form ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await fetch(`${API_BASE}/track/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          campaignId,
          userId,
          ...formValues,
        }),
      });
    } catch {
      // Still show caught page even if network fails
    } finally {
      setIsSubmitting(false);
      setPageState('caught');
    }
  };

  // ── Report as suspicious ──────────────────────────────────────────────────
  const handleReport = async () => {
    try {
      await fetch(`${API_BASE}/track/report`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, campaignId, userId }),
      });
    } catch {}
    setPageState('reported');
  };

  // ── CAUGHT page ───────────────────────────────────────────────────────────
  if (pageState === 'caught') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-3">
            This Was a Security Simulation
          </h1>
          <p className="text-gray-600 mb-4">
            You submitted information to a fake page. In a real attack, your
            credentials would now be compromised.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-red-700 mb-2">
              What you should have done:
            </p>
            <ul className="text-sm text-red-600 space-y-1">
              <li>✗ Never click links in unexpected SMS messages</li>
              <li>✓ Go directly to the official website instead</li>
              <li>✓ Report suspicious messages to IT security</li>
            </ul>
          </div>
          <p className="text-xs text-gray-400">
            Your response has been recorded. Check your security dashboard.
          </p>
        </div>
      </div>
    );
  }

  // ── REPORTED page ─────────────────────────────────────────────────────────
  if (pageState === 'reported') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">🛡️</div>
          <h1 className="text-2xl font-bold text-green-600 mb-3">
            Great Job! You Identified a Phishing Attempt
          </h1>
          <p className="text-gray-600 mb-4">
            This was a security simulation and you correctly identified it as
            suspicious.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-2xl font-bold text-green-600">+50 Points Earned! 🎉</p>
            <p className="text-sm text-green-700 mt-1">
              Your security awareness score has improved
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Check your dashboard to see your updated rank.
          </p>
        </div>
      </div>
    );
  }

  // ── FAKE PHISHING FORM ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Branded header */}
        <div className={`${config.headerColor} text-white p-6 text-center`}>
          <div className="text-4xl mb-2">{config.logo}</div>
          <h1 className="text-xl font-bold">{config.title}</h1>
        </div>

        {/* Subtle report button */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={handleReport}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Report as suspicious
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Please verify your information to continue
          </p>

          {config.fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                required
                value={formValues[field.name] ?? ''}
                onChange={e =>
                  setFormValues(prev => ({ ...prev, [field.name]: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg text-white font-semibold text-sm transition ${config.headerColor} hover:opacity-90 disabled:opacity-60`}
          >
            {isSubmitting ? 'Please wait...' : config.buttonText}
          </button>

          <p className="text-xs text-center text-gray-400">
            🔒 Secured with 256-bit SSL encryption
          </p>
        </form>
      </div>
    </div>
  );
}