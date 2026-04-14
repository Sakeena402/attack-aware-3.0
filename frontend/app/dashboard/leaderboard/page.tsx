// frontend/app/dashboard/leaderboard/page.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/app/context/authContext';
import { leaderboardApi } from '@/app/services/leaderboardApi';
import { employeeApi } from '@/app/services/employeeApi';
import type { LeaderboardEntry } from '@/app/services/types';
import {
  Trophy, Medal, Award, TrendingUp, TrendingDown,
  Minus, Crown, Star, Users,
} from 'lucide-react';

const rankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal  className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Award  className="w-6 h-6 text-orange-500" />;
  return null;
};

const badgeColor = (badge: string) => {
  switch (badge?.toLowerCase()) {
    case 'expert':
    case 'champion':   return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'aware':
    case 'defender':   return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'guardian':   return 'bg-green-500/20 text-green-400 border-green-500/30';
    default:           return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const trendIcon = (trend: string) => {
  if (trend === 'up')   return <TrendingUp   className="w-4 h-4 text-green-400" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

export default function LeaderboardPage() {
  const { state }              = useAuth();
  const [filterDepartment, setFilterDepartment] = useState('all');

  // Leaderboard — uses leaderboardApi so unwrapping is handled there
  const { data: leaderboard = [], isLoading } = useSWR<LeaderboardEntry[]>(
    ['leaderboard', state.user?.companyId, filterDepartment],
    () => leaderboardApi.getAll({
      companyId:  state.user?.companyId,
      department: filterDepartment !== 'all' ? filterDepartment : undefined,
      limit:      50,
    }),
    { revalidateOnFocus: false }
  );

  // Employees — use employeeApi so the paginated wrapper is handled correctly
  const { data: employeesResponse } = useSWR(
    state.user?.companyId ? ['employees-for-depts', state.user.companyId] : null,
    () => employeeApi.getAll(
      state.user?.companyId ? { companyId: state.user.companyId, limit: 200 } : undefined
    ),
    { revalidateOnFocus: false }
  );

  // employeeApi.getAll returns { employees: [...], pagination: {} }
  const departments = [
    'all',
    ...new Set(
      (employeesResponse?.employees ?? []).map(e => e.department).filter(Boolean)
    ),
  ] as string[];

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const currentUserRank = leaderboard.findIndex(e => e.userId === state.user?.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-poppins text-foreground mb-2">Leaderboard</h1>
        <p className="text-muted-foreground">See how your team compares in cybersecurity awareness</p>
      </motion.div>

      {/* Your Rank Card */}
      {currentUserRank >= 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                  #{currentUserRank + 1}
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">Your Ranking</p>
                  <p className="text-sm text-muted-foreground">
                    {leaderboard[currentUserRank]?.score ?? 0} points
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Keep going!</p>
                <p className="text-purple-400 font-medium">
                  {currentUserRank > 0
                    ? `${(leaderboard[currentUserRank - 1]?.score ?? 0) - (leaderboard[currentUserRank]?.score ?? 0)} pts to next rank`
                    : 'You are #1!'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Department Filter */}
      <motion.div
        className="flex gap-2 flex-wrap"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      >
        {departments.map(dept => (
          <button
            key={dept}
            onClick={() => setFilterDepartment(dept)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterDepartment === dept
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground border border-purple-500/20'
            }`}
          >
            {dept === 'all' ? 'All Departments' : dept}
          </button>
        ))}
      </motion.div>

      {/* Top 3 Podium */}
      {!isLoading && top3.length >= 3 && (
        <motion.div
          className="grid grid-cols-3 gap-4 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          {/* 2nd Place */}
          <motion.div className="flex flex-col items-center pt-8" whileHover={{ y: -5 }}>
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-lg">
                {top3[1]?.userName?.charAt(0) ?? '2'}
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
                <Medal className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="font-bold text-foreground text-center truncate max-w-full">{top3[1]?.userName}</p>
            <p className="text-xs text-muted-foreground">{top3[1]?.department}</p>
            <p className="text-lg font-bold text-gray-400 mt-1">{top3[1]?.score} pts</p>
            <div className="h-24 w-full bg-gradient-to-t from-gray-500/30 to-gray-500/10 rounded-t-lg mt-3" />
          </motion.div>

          {/* 1st Place */}
          <motion.div className="flex flex-col items-center" whileHover={{ y: -5 }}>
            <div className="relative">
              <Crown className="w-8 h-8 text-yellow-500 absolute -top-8 left-1/2 -translate-x-1/2" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-3xl mb-3 shadow-lg shadow-yellow-500/30">
                {top3[0]?.userName?.charAt(0) ?? '1'}
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="font-bold text-foreground text-center truncate max-w-full text-lg">{top3[0]?.userName}</p>
            <p className="text-sm text-muted-foreground">{top3[0]?.department}</p>
            <p className="text-xl font-bold text-yellow-500 mt-1">{top3[0]?.score} pts</p>
            <div className="h-32 w-full bg-gradient-to-t from-yellow-500/30 to-yellow-500/10 rounded-t-lg mt-3" />
          </motion.div>

          {/* 3rd Place */}
          <motion.div className="flex flex-col items-center pt-12" whileHover={{ y: -5 }}>
            <div
              className="rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-xl mb-3 shadow-lg"
              style={{ width: 72, height: 72 }}
            >
              {top3[2]?.userName?.charAt(0) ?? '3'}
            </div>
            <p className="font-bold text-foreground text-center truncate max-w-full">{top3[2]?.userName}</p>
            <p className="text-xs text-muted-foreground">{top3[2]?.department}</p>
            <p className="text-lg font-bold text-orange-500 mt-1">{top3[2]?.score} pts</p>
            <div className="h-16 w-full bg-gradient-to-t from-orange-500/30 to-orange-500/10 rounded-t-lg mt-3" />
          </motion.div>
        </motion.div>
      )}

      {/* Full Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      >
        <Card className="overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-purple-500/20">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Employee</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Department</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Points</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Badge</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Trend</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-purple-500/10">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <AnimatePresence>
                    {leaderboard.map((entry, idx) => (
                      <motion.tr
                        // _id is a string from the backend; idx is the safe fallback
                        key={entry._id?.toString() ?? `entry-${idx}`}
                        className={`border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors ${
                          entry.userId === state.user?.id ? 'bg-purple-500/10' : ''
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {rankIcon(idx + 1) ?? (
                              <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">
                                {idx + 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                              {entry.userName?.charAt(0) ?? '?'}
                            </div>
                            <p className="font-medium text-foreground">
                              {entry.userName ?? 'Unknown'}
                              {entry.userId === state.user?.id && (
                                <span className="ml-2 text-xs text-purple-400">(You)</span>
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{entry.department ?? 'N/A'}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-lg text-transparent bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text">
                            {entry.score ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeColor(entry.badge)}`}>
                            {entry.badge ?? 'Rookie'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {trendIcon(entry.trend ?? 'stable')}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {!isLoading && leaderboard.length === 0 && (
        <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No rankings yet</p>
          <p className="text-muted-foreground">Complete campaigns to earn points and appear on the leaderboard</p>
        </motion.div>
      )}
    </div>
  );
}
