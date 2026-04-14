// 'use client';

// import { useAuth } from '@/app/context/authContext';
// import { SidebarProvider } from '@/app/context/sidebarContext';
// import { useRouter } from 'next/navigation';
// import { useEffect } from 'react';
// import { EnhancedSidebar } from '@/components/dashboard/enhanced-sidebar';
// import { EnhancedHeader } from '@/components/dashboard/enhanced-header';

// export default function DashboardLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const { state } = useAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (!state.isAuthenticated) {
//       router.push('/login');
//     }
//   }, [state.isAuthenticated, router]);

//   if (!state.isAuthenticated) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
//         <div className="text-center">
//           <p className="text-slate-400">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <SidebarProvider>
//       <div className="flex h-screen bg-background overflow-hidden">
//         {/* Animated background */}
//         <div className="fixed inset-0 z-0 cyber-grid">
//           <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation" />
//           <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '2s' }} />
//         </div>

//         {/* Sidebar */}
//         <EnhancedSidebar />

//         {/* Main Content */}
//         <div className="flex-1 flex flex-col overflow-hidden relative z-10 md:ml-0">
//           {/* Header */}
//           <EnhancedHeader />

//           {/* Page Content */}
//           <main className="flex-1 overflow-auto">
//             <div className="p-4 md:p-8 max-w-7xl mx-auto">
//               {children}
//             </div>
//           </main>
//         </div>
//       </div>
//     </SidebarProvider>
//   );
// }


'use client';

import { useAuth } from '@/app/context/authContext';
import { SidebarProvider } from '@/app/context/sidebarContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { EnhancedSidebar } from '@/components/dashboard/enhanced-sidebar';
import { EnhancedHeader } from '@/components/dashboard/enhanced-header';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only check authentication after hydration is complete
    if (state.isHydrated && !state.isAuthenticated) {
      console.log('[v0] User not authenticated, redirecting to login');
      router.push('/login');
    }
  }, [state.isHydrated, state.isAuthenticated, router]);

  // Show loading state while hydrating
  if (!state.isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
          </div>
          <p className="text-slate-400">Restoring session...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show dashboard
  if (state.isAuthenticated) {
    return (
      <SidebarProvider>
        <div className="flex h-screen bg-background overflow-hidden">
          {/* Animated background */}
          <div className="fixed inset-0 z-0 cyber-grid">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation" />
            <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '2s' }} />
          </div>

          {/* Sidebar */}
          <EnhancedSidebar />

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden relative z-10 md:ml-0">
            {/* Header */}
            <EnhancedHeader />

            {/* Page Content */}
            <main className="flex-1 overflow-auto">
              <div className="p-4 md:p-8 max-w-7xl mx-auto">
                {children}

                  {/* ✅ All pages under this layout can now show toast notifications */}
                  <Toaster position="top-right" />

              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // If not authenticated and hydration complete, will redirect via useEffect
  return null;
}
