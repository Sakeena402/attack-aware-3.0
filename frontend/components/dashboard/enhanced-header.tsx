'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/app/context/authContext';
import { useSidebar } from '@/app/context/sidebarContext';

export function EnhancedHeader() {
  const { state, logout } = useAuth();
  const { toggle } = useSidebar();
  const [isDark, setIsDark] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <motion.header
      className="sticky top-0 z-40 w-full glassmorphism border-b border-purple-500/20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Mobile Menu Toggle */}
        <motion.button
          onClick={toggle}
          className="md:hidden p-2 hover:bg-muted/50 rounded-lg transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu className="w-5 h-5 text-foreground" />
        </motion.button>

        {/* Search Bar */}
        <motion.div
          className="hidden md:flex flex-1 max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search campaigns, employees..."
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
        </motion.div>

        {/* Right Section */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Mobile Search */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden p-2 hover:bg-muted/50 rounded-lg transition-all"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Notifications */}
          <motion.button
            className="relative p-2 hover:bg-muted/50 rounded-lg transition-all group"
            whileHover={{ scale: 1.05 }}
          >
            <Bell className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            <motion.span
              className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>

          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            className="p-2 hover:bg-muted/50 rounded-lg transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            )}
          </motion.button>

          {/* User Dropdown */}
          <motion.div className="relative">
            <motion.button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 rounded-lg transition-all"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {state.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  className="absolute right-0 mt-2 w-48 bg-card border border-purple-500/20 rounded-lg shadow-xl overflow-hidden z-50"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-purple-500/10">
                    <p className="text-sm font-semibold text-foreground">{state.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{state.user?.email}</p>
                    <p className="text-xs text-purple-400 mt-1 font-semibold capitalize">
                      {state.user?.role?.replace('_', ' ')}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <a
                      href="/dashboard/settings"
                      className="px-4 py-2 text-sm text-foreground hover:bg-muted/50 flex items-center gap-2 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </a>
                    <a
                      href="/dashboard/settings"
                      className="px-4 py-2 text-sm text-foreground hover:bg-muted/50 flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </a>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-purple-500/10 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>

      {/* Mobile Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="px-4 py-3 border-t border-purple-500/20 md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-purple-500/20 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
