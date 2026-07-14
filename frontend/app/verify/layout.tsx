import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Verification',
  description: 'Verify your account',
  robots: 'noindex, nofollow',
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}