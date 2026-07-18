'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '@/app/context/sidebarContext';
import {
  LayoutDashboard, BarChart3, Trophy, Zap, Settings,
  Users, FileText, Shield, LogOut, Building2, Activity,
  TrendingUp, BookOpen, MessageCircle, CheckSquare,
  ChevronDown, PlayCircle, Brain, Gamepad2, Bell, User,
} from 'lucide-react';
import { useAuth } from '@/app/context/authContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: string;
}

interface MenuGroup {
  type: 'link' | 'group';
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  href?: string;
  badge?: string;
  children?: MenuItem[];
}

// ── Menu Config per Role ──────────────────────────────────────────────────────

const getMenuConfig = (role: string | undefined): MenuGroup[] => {
  if (role === 'super_admin') {
    return [
      { type: 'link', icon: LayoutDashboard, label: 'Dashboard',           href: '/dashboard' },
      { type: 'link', icon: Building2,       label: 'Companies',           href: '/dashboard/companies' },
      { type: 'link', icon: BarChart3,       label: 'Global Analytics',    href: '/dashboard/analytics' },
      { type: 'link', icon: Activity,        label: 'User Activity',       href: '/dashboard/user-activity' },
      { type: 'link', icon: Shield,          label: 'Attacks Catalog',     href: '/dashboard/attacks' },
      { type: 'link', icon: Building2,       label: 'Enterprise Requests', href: '/dashboard/enterprise-requests' },
      { type: 'link', icon: Settings,        label: 'Settings',            href: '/dashboard/settings' },
    ];
  }

  if (role === 'admin') {
    return [
      { type: 'link',  icon: LayoutDashboard, label: 'Dashboard',     href: '/dashboard' },
      { type: 'link',  icon: Zap,             label: 'Campaigns',     href: '/dashboard/campaigns', badge: 'NEW' },
      { type: 'link',  icon: Trophy,          label: 'Leaderboard',   href: '/dashboard/leaderboard' },
      { type: 'link',  icon: Users,           label: 'Employees',     href: '/dashboard/employees' },
      { type: 'link',  icon: BarChart3,       label: 'Analytics',     href: '/dashboard/analytics' },
      { type: 'link',  icon: FileText,        label: 'Reports',       href: '/dashboard/reports' },
      { type: 'link',  icon: Activity,        label: 'User Activity', href: '/dashboard/user-activity' },
      { type: 'group', icon: BookOpen,        label: 'Training',
        children: [
          { icon: PlayCircle,    label: 'Videos',   href: '/dashboard/training' },
          { icon: Brain,         label: 'Quizzes',  href: '/dashboard/training?tab=quizzes' },
          { icon: Gamepad2,      label: 'Games',    href: '/dashboard/training?tab=games' },
        ]
      },
      { type: 'group', icon: MessageCircle, label: 'Community',
        children: [
          { icon: MessageCircle, label: 'Forum',          href: '/dashboard/forum' },
          { icon: Shield,        label: 'Attacks Catalog', href: '/dashboard/attacks' },
        ]
      },
      { type: 'link', icon: Settings, label: 'Settings', href: '/dashboard/settings' },
    ];
  }

  if (role === 'employee') {
    return [
      { type: 'link',  icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard' },
      { type: 'link',  icon: Trophy,          label: 'Leaderboard', href: '/dashboard/leaderboard' },
      { type: 'link', icon: BookOpen,   label: 'Training',    href: '/dashboard/training' },
{ type: 'link', icon: TrendingUp, label: 'My Progress', href: '/dashboard/progress' },
      { type: 'group', icon: MessageCircle, label: 'Community',
        children: [
          { icon: MessageCircle, label: 'Forum',           href: '/dashboard/forum' },
          { icon: Bell,          label: 'Messages',         href: '/dashboard/messages' },
          { icon: Shield,        label: 'Attacks Catalog',  href: '/dashboard/attacks' },
        ]
      },
      { type: 'link', icon: CheckSquare, label: 'Tasks',    href: '/dashboard/tasks' },
      { type: 'link', icon: Settings,    label: 'Settings', href: '/dashboard/settings' },
    ];
  }

  if (role === 'individual') {
    return [
      { type: 'link',  icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard' },
      { type: 'link',  icon: Trophy,          label: 'Leaderboard', href: '/dashboard/leaderboard' },
      { type: 'link', icon: BookOpen,   label: 'Training',    href: '/dashboard/training' },
{ type: 'link', icon: TrendingUp, label: 'My Progress', href: '/dashboard/progress' },
      { type: 'group', icon: MessageCircle, label: 'Community',
        children: [
          { icon: MessageCircle, label: 'Forum',           href: '/dashboard/forum' },
          { icon: Shield,        label: 'Attacks Catalog',  href: '/dashboard/attacks' },
        ]
      },
      { type: 'link', icon: Settings, label: 'Settings', href: '/dashboard/settings' },
    ];
  }

  return [
    { type: 'link', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  ];
};

// ── Dropdown Group Component ───────────────────────────────────────────────────

function SidebarGroup({
  group,
  pathname,
  close,
  delay,
}: {
  group: MenuGroup;
  pathname: string;
  close: () => void;
  delay: number;
}) {
  const isChildActive = group.children?.some(c => {
  const childPath = c.href?.split('?')[0] ?? '';
  return pathname === childPath || pathname.startsWith(childPath + '/');
});
const [open, setOpen] = useState(isChildActive ?? false);
  const Icon = group.icon!;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      {/* Group Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
  'text-muted-foreground hover:text-foreground'
}`}
      >
        <div className="p-2 rounded-md transition-all bg-muted/50 group-hover:bg-muted/80">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium flex-1 text-left">{group.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Children */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden ml-4 mt-1 space-y-1"
          >
            {group.children?.map(child => {
              const ChildIcon = child.icon;
              const childPath = child.href?.split('?')[0] ?? '';
              const isActive = pathname === childPath || pathname.startsWith(childPath + '/');

              return (
                <Link
                  key={child.href}
                  href={child.href!}
                  onClick={close}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                    isActive
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium">{child.label}</span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export function EnhancedSidebar() {
  const pathname  = usePathname();
  const { isOpen, close } = useSidebar();
  const { state, logout } = useAuth();

  const menuConfig = getMenuConfig(state.user?.role);

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
          <div className="space-y-1">
            {menuConfig.map((item, idx) => {
              if (item.type === 'group') {
                return (
                  <SidebarGroup
                    key={item.label}
                    group={item}
                    pathname={pathname}
                    close={close}
                    delay={idx * 0.04}
                  />
                );
              }

              const Icon = item.icon!;
              const isActive = pathname === item.href;

              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Link
                    href={item.href!}
                    onClick={close}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 border border-purple-500/50 text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent"
                        layoutId="activeIndicator"
                        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                      />
                    )}
                    <div className={`relative z-10 p-2 rounded-md transition-all ${
                      isActive ? 'bg-purple-500/30' : 'bg-muted/50 group-hover:bg-muted/80'
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
    <Link
      href="/dashboard/profile"
      onClick={close}
      className="flex items-center gap-3 mb-3 p-2 rounded-lg hover:bg-purple-500/10 transition-all group cursor-pointer"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
        {state.user.name?.charAt(0).toUpperCase() || 'U'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-purple-300 transition-colors">
          {state.user.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{state.user.email}</p>
      </div>
    </Link>
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