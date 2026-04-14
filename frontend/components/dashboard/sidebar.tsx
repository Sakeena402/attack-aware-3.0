'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, Users, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/app/context/authContext';

interface SidebarProps {
  isOpen: boolean;
  role?: string;
}

export function Sidebar({ isOpen, role }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['super_admin', 'admin', 'employee'] },
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics', roles: ['admin', 'employee'] },
    { icon: Users, label: 'Leaderboard', href: '/dashboard/leaderboard', roles: ['admin', 'employee'] },
    { icon: Shield, label: 'Campaigns', href: '/dashboard/campaigns', roles: ['admin'] },
    { icon: Users, label: 'Manage Users', href: '/dashboard/users', roles: ['super_admin', 'admin'] },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', roles: ['admin', 'employee'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role || 'employee'));

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
            <span className="font-poppins font-bold text-foreground">Attack Aware 3.0</span>
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
      <nav className="flex-1 p-4 space-y-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/70 hover:bg-muted'
              }`}
              title={!isOpen ? item.label : ''}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-foreground/70 hover:bg-destructive/10 w-full transition-colors"
          title={!isOpen ? 'Logout' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}


