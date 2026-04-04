'use client';

import { useAuth } from '@/app/context/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminDashboard from './admin/page';
import EmployeeDashboard from './employee/page';
import SuperAdminDashboard from './super-admin/page';

export default function DashboardPage() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not hydrated, wait
    if (!state.isHydrated) return;

    // If not authenticated, redirect to login
    if (!state.isAuthenticated) {
      router.push('/login');
      return;
    }

    // User is authenticated and hydrated, role-specific dashboard will render below
  }, [state.isHydrated, state.isAuthenticated, router]);

  // Still loading
  if (!state.isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!state.isAuthenticated) {
    return null;
  }

  // Render role-specific dashboard
  if (state.user?.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  if (state.user?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (state.user?.role === 'employee') {
    return <EmployeeDashboard />;
  }

  return null;
}
