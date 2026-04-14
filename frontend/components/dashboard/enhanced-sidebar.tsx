'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '@/app/context/sidebarContext';
import {
  LayoutDashboard,
  BarChart3,
  Trophy,
  Zap,
  Settings,
  Users,
  FileText,
  Shield,
  Menu,
  X,
  LogOut,
  Building2,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/app/context/authContext';

const getMenuItems = (role: string | undefined) => {
  const baseMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['super_admin', 'admin', 'employee'] },
  ];

  const roleBasedItems: Record<string, Array<any>> = {
    super_admin: [
      { icon: Building2, label: 'Companies', href: '/dashboard/companies', roles: ['super_admin'] },
      { icon: BarChart3, label: 'Global Analytics', href: '/dashboard/analytics', roles: ['super_admin'] },
      { icon: Activity, label: 'System Health', href: '/dashboard/system', roles: ['super_admin'] },
    ],
    admin: [
      { icon: Zap, label: 'Campaigns', href: '/dashboard/campaigns', roles: ['admin'], badge: 'NEW' },
      { icon: Users, label: 'Employees', href: '/dashboard/employees', roles: ['admin'] },
      { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics', roles: ['admin'] },
      { icon: Trophy, label: 'Leaderboard', href: '/dashboard/leaderboard', roles: ['admin'] },
    ],
    employee: [
      { icon: Trophy, label: 'Leaderboard', href: '/dashboard/leaderboard', roles: ['employee'] },
      { icon: FileText, label: 'Training', href: '/dashboard/training', roles: ['employee'] },
      { icon: Zap, label: 'Simulations', href: '/dashboard/simulations', roles: ['employee'] },
    ],
  };

  const items = [...baseMenuItems];
  if (role && roleBasedItems[role]) {
    items.push(...roleBasedItems[role]);
  }

  // Settings and logout available to all
  items.push(
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', roles: ['super_admin', 'admin', 'employee'] },
  );

  return items;
};

export function EnhancedSidebar() {
  const pathname = usePathname();
  const { isOpen, toggle, close } = useSidebar();
  const { state, logout } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden z-40"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed left-0 top-0 h-screen w-72 glassmorphism border-r border-purple-500/20 flex flex-col overflow-hidden z-50 md:relative md:w-64 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out`}
      >
        {/* Header */}
        <motion.div
          className="px-6 py-6 border-b border-purple-500/20 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 cyber-glow">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white font-poppins text-sm">Attack Aware</h2>
            <p className="text-xs text-muted-foreground">v3.0</p>
          </div>
        </motion.div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
          <div className="space-y-2">
            {getMenuItems(state.user?.role).map((item, idx) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={close}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 border border-purple-500/50 text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {/* Active indicator glow */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent"
                        layoutId="activeIndicator"
                        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                      />
                    )}

                    <div className={`relative z-10 p-2 rounded-md transition-all ${
                      isActive 
                        ? 'bg-purple-500/30' 
                        : 'bg-muted/50 group-hover:bg-muted/80'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <span className="text-sm font-medium flex-1 relative z-10">{item.label}</span>

                    {item.badge && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/30 text-red-400 font-semibold relative z-10">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </nav>

        {/* User Info */}
        {state.user && (
          <motion.div
            className="px-4 py-3 border-t border-purple-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                {state.user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{state.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{state.user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </motion.div>
        )}
      </motion.aside>
    </>
  );
}


