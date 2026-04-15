// frontend/app/verify/caught/page.tsx
export default function CaughtPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-red-600 mb-3">This was a Security Test</h1>
        <p className="text-gray-600 mb-4">
          You submitted credentials to a simulated phishing page. In a real attack this would be dangerous.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
          <p className="text-sm font-semibold text-red-700 mb-2">Remember:</p>
          <ul className="text-sm text-red-600 space-y-1">
            <li>✗ Never click links in unexpected SMS messages</li>
            <li>✓ Always verify by going directly to the official site</li>
            <li>✓ Report suspicious messages to IT security</li>
          </ul>
        </div>
      </div>
    </div>
  );
}