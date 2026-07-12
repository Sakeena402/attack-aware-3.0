'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BarChart3, Users, Settings, LogOut, Shield,
  FileText, Play, HelpCircle, Gamepad2, MessageCircle,
  CheckSquare, TrendingUp, Building2, Activity, Globe,
} from 'lucide-react';
import { useAuth } from '@/app/context/authContext';

interface SidebarProps {
  isOpen: boolean;
  role?: string;
}

export function Sidebar({ isOpen, role }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const menuItems = [
    // ── Existing ──────────────────────────────────────────────
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/dashboard',
      roles: ['super_admin', 'admin', 'employee'],
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      href: '/dashboard/analytics',
      roles: ['super_admin', 'admin', 'employee'],
    },
    {
      icon: Building2,
      label: 'Companies',
      href: '/dashboard/companies',
      roles: ['super_admin'],
    },
    {
      icon: Activity,
      label: 'System Health',
      href: '/dashboard/system-health',
      roles: ['super_admin'],
    },
    {
      icon: Shield,
      label: 'Campaigns',
      href: '/dashboard/campaigns',
      roles: ['admin'],
    },
    {
      icon: Users,
      label: 'Employees',
      href: '/dashboard/employees',
      roles: ['admin'],
    },
    {
      icon: Users,
      label: 'Leaderboard',
      href: '/dashboard/leaderboard',
      roles: ['admin', 'employee'],
    },
    {
      icon: FileText,
      label: 'Reports',
      href: '/dashboard/reports',
      roles: ['admin'],
    },

    // ── New from 2.0 migration ─────────────────────────────────
    {
      icon: Play,
      label: 'Videos',
      href: '/dashboard/videos',
      roles: ['admin', 'employee'],
    },
    {
      icon: HelpCircle,
      label: 'Quizzes',
      href: '/dashboard/quizzes',
      roles: ['admin', 'employee'],
    },
    {
      icon: Gamepad2,
      label: 'Games',
      href: '/dashboard/games',
      roles: ['admin', 'employee'],
    },
    {
      icon: MessageCircle,
      label: 'Forum',
      href: '/dashboard/forum',
      roles: ['admin', 'employee'],
    },
    {
      icon: CheckSquare,
      label: 'Tasks',
      href: '/dashboard/tasks',
      roles: ['employee'],
    },
    {
      icon: TrendingUp,
      label: 'My Progress',
      href: '/dashboard/progress',
      roles: ['employee'],
    },

    // ── Common ─────────────────────────────────────────────────
    {
      icon: Settings,
      label: 'Settings',
      href: '/dashboard/settings',
      roles: ['admin', 'employee'],
    },
  ];

  const filteredItems = menuItems.filter(item =>
    item.roles.includes(role || 'employee')
  );

  // Group items for visual separation
  const adminOnlyItems   = ['Campaigns', 'Employees', 'Reports'];
  const superAdminItems  = ['Companies', 'System Health'];
  const learningItems    = ['Videos', 'Quizzes', 'Games', 'Forum'];
  const employeeOnlyItems = ['Tasks', 'My Progress'];

  const getItemGroup = (label: string) => {
    if (superAdminItems.includes(label))   return 'platform';
    if (adminOnlyItems.includes(label))    return 'manage';
    if (learningItems.includes(label))     return 'learn';
    if (employeeOnlyItems.includes(label)) return 'personal';
    return 'main';
  };

  // Section labels
  const sectionLabels: Record<string, string> = {
    platform: 'Platform',
    manage:   'Management',
    learn:    'Learning',
    personal: 'My Space',
  };

  // Build grouped sections
  const sections: Record<string, typeof filteredItems> = {};
  filteredItems.forEach(item => {
    const group = getItemGroup(item.label);
    if (!sections[group]) sections[group] = [];
    sections[group].push(item);
  });

  const sectionOrder = ['main', 'platform', 'manage', 'learn', 'personal'];

  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-card border-r border-border transition-all duration-300 flex flex-col`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-border">
        {isOpen ? (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-foreground text-sm block">Attack Aware</span>
              <span className="text-xs text-slate-400">v3.0</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {sectionOrder.map(sectionKey => {
          const items = sections[sectionKey];
          if (!items || items.length === 0) return null;

          return (
            <div key={sectionKey} className="mb-2">
              {/* Section label — only when sidebar is open and not 'main' */}
              {isOpen && sectionKey !== 'main' && (
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2 mt-2">
                  {sectionLabels[sectionKey]}
                </p>
              )}

              {items.map(item => {
                // Exact match for dashboard, prefix match for others
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                    }`}
                    title={!isOpen ? item.label : ''}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-purple-400' : ''}`} />
                    {isOpen && (
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    )}
                    {/* Active indicator dot */}
                    {isActive && !isOpen && (
                      <div className="absolute right-0 w-1 h-6 bg-purple-500 rounded-l-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-foreground/70 hover:bg-red-500/10 hover:text-red-400 w-full transition-colors"
          title={!isOpen ? 'Logout' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}