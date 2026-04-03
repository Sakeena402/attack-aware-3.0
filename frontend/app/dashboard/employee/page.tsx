// frontend/app/dashboard/employee/page.tsx
'use client';

import { useAuth } from '@/app/context/authContext';
import { motion } from 'framer-motion';
import useSWR from 'swr';

import { apiService } from '@/app/services/api';

import { MetricCard } from '@/components/dashboard/metric-card';
import { StatCardSkeleton } from '@/components/ui/skeleton-loader';
import { Award, Target, TrendingUp, Zap, Trophy, Medal } from 'lucide-react';
import { Card } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await apiService.get(url);
  return response.data;
};

export default function EmployeeDashboard() {
  const { state } = useAuth();

  // Only EMPLOYEE role can access
  if (state.user?.role !== 'employee') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Access Denied: Employee role required</p>
      </div>
    );
  }

  // Fetch personal leaderboard rank
  const { data: userRank, isLoading: rankLoading } = useSWR(
    state.user?.id ? `/leaderboard/user/${state.user.id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch company leaderboard for context
  const { data: leaderboard, isLoading: leaderboardLoading } = useSWR(
    '/leaderboard?limit=10',
    fetcher,
    { revalidateOnFocus: false }
  );

  // Employee metrics
  const points = state.user?.points || 0;
  const badge = state.user?.badge || 'Trainee';
  const trainingProgress = 65; // Example: would come from completed training modules

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Your Security Journey</h1>
        <p className="text-slate-400">Track your security awareness progress</p>
      </motion.div>

      {/* Personal Metrics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {rankLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Your Points"
              value={points}
              icon={Award}
              trend={+12}
              color="purple"
            />
            <MetricCard
              title="Current Rank"
              value={`#${userRank?.rank || 'N/A'}`}
              icon={Trophy}
              trend={+2}
              color="yellow"
            />
            <MetricCard
              title="Percentile"
              value={`${userRank?.percentile || 0}%`}
              icon={TrendingUp}
              trend={+5}
              color="green"
            />
            <MetricCard
              title="Badge Level"
              value={badge}
              icon={Zap}
              color="blue"
            />
          </>
        )}
      </motion.div>

      {/* Training Progress and Leaderboard */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Training Progress */}
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Training Progress</h2>
              <p className="text-slate-400 text-sm">Complete all modules to master cybersecurity</p>
            </div>

            <div className="space-y-4">
              {[
                { name: 'Email Phishing 101', progress: 100, completed: true },
                { name: 'SMS & Vishing Defense', progress: 75, completed: false },
                { name: 'Password Security', progress: 50, completed: false },
                { name: 'Data Protection Basics', progress: 25, completed: false },
              ].map((module, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{module.name}</p>
                    <span className="text-xs text-slate-400">{module.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${module.progress}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={`h-full rounded-full ${
                        module.completed
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-purple-500 to-cyan-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Overall Progress</p>
                <span className="text-2xl font-bold text-purple-400">62.5%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Department Leaderboard */}
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Department Rankings</h2>
              <p className="text-slate-400 text-sm">Compare with your peers</p>
            </div>
            <Medal className="text-yellow-400" size={24} />
          </div>

          {leaderboardLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.slice(0, 8).map((entry, index) => {
                const isCurrentUser = entry.userId === state.user?.id;
                return (
                  <motion.div
                    key={entry._id ?? entry.userId ?? index}  // ← fixed
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg transition ${
                      isCurrentUser
                        ? 'bg-gradient-to-r from-purple-500/30 to-cyan-500/30 border border-purple-500/50'
                        : 'bg-slate-700/50 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : index === 1
                            ? 'bg-gray-400/20 text-gray-300'
                            : index === 2
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${isCurrentUser ? 'text-purple-300' : 'text-foreground'}`}>
                          {isCurrentUser ? 'YOU' : entry.userId}
                        </p>
                        <p className="text-xs text-slate-400">{entry.department || 'N/A'}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${isCurrentUser ? 'text-purple-400' : 'text-slate-300'}`}>
                      {entry.score} pts
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No leaderboard data available</p>
          )}
        </Card>
      </motion.div>

      {/* Achievement Badges */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <h2 className="text-xl font-bold text-foreground mb-6">Your Badges</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'First Click', earned: true, icon: '🎯' },
              { name: 'Report Master', earned: true, icon: '🛡️' },
              { name: 'Security Champion', earned: false, icon: '👑' },
              { name: 'Perfect Defender', earned: false, icon: '⭐' },
            ].map((badge, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border transition ${
                  badge.earned
                    ? 'bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border-purple-500/50'
                    : 'bg-slate-700/50 border-slate-700 opacity-50'
                }`}
              >
                <span className="text-3xl mb-2">{badge.icon}</span>
                <p className="text-xs font-medium text-center text-foreground">{badge.name}</p>
                {badge.earned && <p className="text-xs text-green-400 mt-1">Earned</p>}
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
