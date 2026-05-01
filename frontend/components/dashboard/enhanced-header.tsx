'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, LogOut, User, Settings, ChevronDown, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';  // ← ADD
import { useAuth } from '@/app/context/authContext';
import { useSidebar } from '@/app/context/sidebarContext';

export function EnhancedHeader() {
  const { state, logout } = useAuth();
  const { toggle } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // ← SAARI isDark/theme wali code HATAO

  return (
    <motion.header
      className="sticky top-0 z-40 w-full glassmorphism border-b border-purple-500/20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        <motion.button onClick={toggle} className="md:hidden p-2 hover:bg-muted/50 rounded-lg">
          <Menu className="w-5 h-5 text-foreground" />
        </motion.button>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search campaigns, employees..."
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <button onClick={() => setSearchOpen(!searchOpen)} className="md:hidden p-2 hover:bg-muted/50 rounded-lg">
            <Search className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-muted/50 rounded-lg">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Theme Toggle — sirf yeh ek line */}
          <ThemeToggle />

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {state.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  className="absolute right-0 mt-2 w-48 bg-card border border-purple-500/20 rounded-lg shadow-xl overflow-hidden z-50"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="px-4 py-3 border-b border-purple-500/10">
                    <p className="text-sm font-semibold text-foreground">{state.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{state.user?.email}</p>
                    <p className="text-xs text-purple-400 mt-1 font-semibold capitalize">
                      {state.user?.role?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="py-2">
                    <a href="/dashboard/settings" className="px-4 py-2 text-sm text-foreground hover:bg-muted/50 flex items-center gap-2">
                      <User className="w-4 h-4" /> Profile
                    </a>
                    <a href="/dashboard/settings" className="px-4 py-2 text-sm text-foreground hover:bg-muted/50 flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Settings
                    </a>
                  </div>
                  <div className="border-t border-purple-500/10 py-2">
                    <button onClick={logout} className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div className="px-4 py-3 border-t border-purple-500/20 md:hidden"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}