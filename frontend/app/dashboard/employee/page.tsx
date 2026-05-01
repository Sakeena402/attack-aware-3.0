
// frontend/app/dashboard/employee/page.tsx
'use client';

import { useAuth } from '@/app/context/authContext';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { analyticsApi, UserAnalytics } from '@/app/services/analyticsApi';
import { leaderboardApi }              from '@/app/services/leaderboardApi';
import { StatCardSkeleton }            from '@/components/ui/skeleton-loader';
import { Card }                        from '@/components/ui/card';
import {
  Award, TrendingUp, Trophy, Medal, Shield,
  AlertTriangle, CheckCircle, XCircle, Minus,
} from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import type { LeaderboardEntry } from '@/app/services/types';

// ── Badge ladder ──────────────────────────────────────────────────────────────
const BADGES = [
  { name: 'Security Champion', min: 1000, icon: '👑', color: '#8b5cf6' },
  { name: 'Security Expert',   min: 500,  icon: '🏆', color: '#eab308' },
  { name: 'Security Aware',    min: 250,  icon: '🛡️', color: '#3b82f6' },
  { name: 'Security Learner',  min: 100,  icon: '📚', color: '#10b981' },
  { name: 'Rookie',            min: 0,    icon: '🎯', color: '#64748b' },
];

const ACTION_CFG = {
  reported:    { label: 'Reported',      icon: CheckCircle,    cls: 'text-green-400',  bg: 'bg-green-500/20' },
  compromised: { label: 'Compromised',   icon: XCircle,        cls: 'text-red-400',    bg: 'bg-red-500/20' },
  clicked:     { label: 'Clicked Link',  icon: AlertTriangle,  cls: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  engaged:     { label: 'Call Engaged',  icon: AlertTriangle,  cls: 'text-orange-400', bg: 'bg-orange-500/20' },
  received:    { label: 'No Action',     icon: Minus,          cls: 'text-slate-400',  bg: 'bg-slate-700' },
} as const;

export default function EmployeeDashboard() {
  const { state } = useAuth();

  if (state.user?.role !== 'employee') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Access Denied: Employee role required</p>
      </div>
    );
  }

  const { data: analytics, isLoading } = useSWR<UserAnalytics>(
    state.user?.id ? `myAnalytics:${state.user.id}` : null,
    () => analyticsApi.getMyAnalytics(),
    { revalidateOnFocus: false }
  );

  const { data: leaderboard = [], isLoading: lbLoading } = useSWR<LeaderboardEntry[]>(
    state.user?.companyId ? ['lb', state.user.companyId] : null,
    () => leaderboardApi.getAll({ companyId: state.user?.companyId, limit: 10 }),
    { revalidateOnFocus: false }
  );

  const user  = analytics?.user;
  const stats = analytics?.stats;
  const rank  = analytics?.ranking;

  // Badge progress
  const pts        = user?.points ?? 0;
  const earnedBadge = BADGES.find(b => pts >= b.min) ?? BADGES[BADGES.length - 1];
  const nextBadge   = BADGES.slice().reverse().find(b => b.min > pts);
  const progress    = nextBadge
    ? Math.min(100, Math.round(((pts - earnedBadge.min) / (nextBadge.min - earnedBadge.min)) * 100))
    : 100;

  // Risk gauge data
  const riskScore = user?.riskScore ?? 0;
  const riskColor = riskScore >= 60 ? '#ef4444' : riskScore >= 40 ? '#f59e0b' : '#10b981';
  const gaugeData = [{ value: riskScore, fill: riskColor }];

  // Behaviour pie
  const behaviourPie = stats ? [
    { name: 'Safe',        value: stats.safeRate,       color: '#10b981' },
    { name: 'Clicked',     value: stats.clickRate,      color: '#f59e0b' },
    { name: 'Compromised', value: stats.compromiseRate, color: '#ef4444' },
    { name: 'Reported',    value: stats.reportRate,     color: '#8b5cf6' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">
          Your Security Journey{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-slate-400">Track progress and improve your cybersecurity awareness</p>
      </motion.div>

      {/* ── Top 4 Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20"><Award className="w-5 h-5 text-purple-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{pts}</p><p className="text-xs text-muted-foreground">Points</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20"><Trophy className="w-5 h-5 text-yellow-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">#{rank?.rank ?? '—'}</p><p className="text-xs text-muted-foreground">Company Rank</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20"><TrendingUp className="w-5 h-5 text-green-400" /></div>
                <div><p className="text-2xl font-bold text-foreground">{rank?.percentile ?? 0}%</p><p className="text-xs text-muted-foreground">Percentile</p></div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20"><Shield className="w-5 h-5 text-blue-400" /></div>
                <div><p className="text-lg font-bold text-foreground truncate">{user?.badge ?? 'Rookie'}</p><p className="text-xs text-muted-foreground">Badge</p></div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ── Risk Gauge + Badge Progress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <h2 className="text-xl font-bold text-foreground mb-4">Your Risk Score</h2>
          {isLoading ? <div className="h-48 bg-slate-700 rounded animate-pulse" /> : (
            <div className="flex items-center gap-6">
              <div style={{ width: 160, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="60%" outerRadius="90%"
                    data={gaugeData} startAngle={90} endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#1e293b' }} />
                    <Tooltip formatter={(v) => [`${v}`, 'Risk Score']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-4xl font-bold" style={{ color: riskColor }}>{riskScore}</p>
                  <p className="text-sm font-medium capitalize" style={{ color: riskColor }}>
                    {user?.riskLevel ?? 'low'} Risk
                  </p>
                </div>
                <div className="space-y-1.5 text-xs">
                  {[
                    { label: 'Simulations',     value: stats?.totalSimulations ?? 0, cls: 'text-foreground' },
                    { label: 'Reports (+10pts)', value: stats?.reports ?? 0,          cls: 'text-green-400' },
                    { label: 'Clicks  (−20pts)', value: stats?.clicks ?? 0,           cls: 'text-yellow-400' },
                    { label: 'Compromised (−40)', value: stats?.credentials ?? 0,     cls: 'text-red-400' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-400">{label}</span>
                      <span className={`font-medium ${cls}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <h2 className="text-xl font-bold text-foreground mb-4">Badge Progress</h2>
          {isLoading ? <div className="h-48 bg-slate-700 rounded animate-pulse" /> : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{earnedBadge.icon}</span>
                <div>
                  <p className="font-bold text-foreground">{earnedBadge.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pts} pts · {nextBadge ? `${nextBadge.min - pts} pts to ${nextBadge.name}` : 'Max level reached!'}
                  </p>
                </div>
              </div>
              {nextBadge && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress to {nextBadge.name}</span>
                    <span className="text-foreground">{progress}%</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(to right, ${earnedBadge.color}, ${nextBadge.color})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.2 }}
                    />
                  </div>
                </div>
              )}
              {/* Badge grid */}
              <div className="grid grid-cols-5 gap-2">
                {BADGES.slice().reverse().map((b, i) => (
                  <div key={i} className={`flex flex-col items-center p-2 rounded-lg border transition ${
                    pts >= b.min
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-slate-700 bg-slate-700/50 opacity-40'
                  }`}>
                    <span className="text-lg">{b.icon}</span>
                    <p className="text-center text-foreground mt-1" style={{ fontSize: '9px' }}>
                      {b.name.split(' ').pop()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── History + Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulation History */}
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <h2 className="text-xl font-bold text-foreground mb-4">Simulation History</h2>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-700 rounded animate-pulse" />)}</div>
          ) : (analytics?.history ?? []).length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {analytics!.history.map((item, i) => {
                const cfg = ACTION_CFG[item.action as keyof typeof ACTION_CFG] ?? ACTION_CFG.received;
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className={`p-2 rounded-lg ${cfg.bg} flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.cls}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.campaignName}</p>
                      <p className="text-xs text-slate-400 capitalize">{item.type} · {new Date(item.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                      {item.pointsEarned !== 0 && (
                        <p className={`text-xs ${item.pointsEarned > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.pointsEarned > 0 ? '+' : ''}{item.pointsEarned} pts
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No simulations received yet — stay alert!</p>
            </div>
          )}
        </Card>

        {/* Leaderboard */}
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Company Rankings</h2>
              <p className="text-slate-400 text-sm">See where you stand</p>
            </div>
            <Medal className="text-yellow-400" size={24} />
          </div>
          {lbLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />)}</div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry, idx) => {
                const isMe = entry.userId === state.user?.id;
                return (
                  <motion.div
                    key={entry._id?.toString() ?? idx}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex items-center justify-between p-3 rounded-lg transition ${
                      isMe ? 'bg-gradient-to-r from-purple-500/30 to-cyan-500/30 border border-purple-500/50' : 'bg-slate-700/50 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                        idx === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-600 text-slate-300'
                      }`}>{idx + 1}</span>
                      <div>
                        <p className={`text-sm font-medium ${isMe ? 'text-purple-300' : 'text-foreground'}`}>
                          {isMe ? 'YOU' : (entry.userName ?? 'Unknown')}
                        </p>
                        <p className="text-xs text-slate-400">{entry.department ?? 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isMe ? 'text-purple-400' : 'text-slate-300'}`}>{entry.score} pts</p>
                      <p className="text-xs text-slate-500">{entry.badge ?? 'Rookie'}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No leaderboard data available</p>
          )}
        </Card>
      </div>
    </div>
  );
}