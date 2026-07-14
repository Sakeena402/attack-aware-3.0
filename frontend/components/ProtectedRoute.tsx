'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/authContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ('super_admin' | 'admin' | 'employee')[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { state } = useAuth();
  const router = useRouter();

  // Still loading/hydrating
  if (!state.isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!state.isAuthenticated) {
    router.push(redirectTo);
    return null;
  }

  // User role not allowed
  if (!state.user || !allowedRoles.includes(state.user.role)) {
    console.log(
      `[v0] Access denied: User role ${state.user?.role} not in allowed roles: ${allowedRoles.join(', ')}`
    );
    router.push('/unauthorized');
    return null;
  }

  // Access granted
  return <>{children}</>;
}

/**
 * Helper for Super Admin only
 */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={['super_admin']}>{children}</ProtectedRoute>;
}

/**
 * Helper for Admin and Super Admin
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={['admin', 'super_admin']}>{children}</ProtectedRoute>;
}

/**
 * Helper for Employee only
 */
export function EmployeeRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={['employee']}>{children}</ProtectedRoute>;
}
