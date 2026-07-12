'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import {
  Activity, Users, Video, Brain,
  Gamepad2, TrendingUp, Search, ChevronUp,
  ChevronDown, Trophy, Shield,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Employee {
  _id: string;
  id: string;
  name: string;
  email: string;
  department: string;
  points: number;
  badge: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface EmployeeProgress {
  userId: string;
  videosCompleted: number;
  quizzesTaken: number;
  gamesPlayed: number;
  points: number;
  badge: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  low:    { label: 'Low',    class: 'bg-green-500/20 text-green-400 border-green-500/30' },
  medium: { label: 'Medium', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  high:   { label: 'High',   class: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

type SortKey = 'name' | 'points' | 'riskScore' | 'videosCompleted' | 'quizzesTaken' | 'gamesPlayed';

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="bg-slate-800/60 border-slate-700/50 p-5">
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserActivityPage() {
  const { state }   = useAuth();
  const [search, setSearch]       = useState('');
  const [sortKey, setSortKey]     = useState<SortKey>('points');
  const [sortAsc, setSortAsc]     = useState(false);
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  // Fetch employees
  const { data: empData, isLoading: empLoading } = useSWR(
    state.user?.id ? 'employees-list' : null,
    () => apiService.get<{ employees: Employee[] }>('/employees').then(r => r.data),
    { revalidateOnFocus: false }
  );

  const employees: Employee[] = empData?.employees ?? [];

  // Fetch progress for each employee via /progress/my scoped by admin
  // Backend returns aggregate for company when called as admin
  const { data: progressData, isLoading: progLoading } = useSWR(
    state.user?.id ? 'company-progress' : null,
    () => apiService.get<EmployeeProgress[]>('/progress/company').then(r =>
      Array.isArray(r.data) ? r.data : []
    ),
    { revalidateOnFocus: false }
  );

  const progressMap = new Map<string, EmployeeProgress>(
    (progressData ?? []).map(p => [p.userId, p])
  );

  // Merge employees with progress
  const merged = employees.map(emp => {
    const prog = progressMap.get(emp._id) ?? {
      videosCompleted: 0,
      quizzesTaken: 0,
      gamesPlayed: 0,
      points: emp.points ?? 0,
      badge: emp.badge ?? 'Rookie',
      riskScore: emp.riskScore ?? 0,
      riskLevel: emp.riskLevel ?? 'low',
    };
    return { ...emp, ...prog };
  });

  // Filter + search + sort
  const filtered = merged
    .filter(e => riskFilter === 'all' || e.riskLevel === riskFilter)
    .filter(e =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

  // Summary stats
  const totalVideos  = merged.reduce((s, e) => s + (e.videosCompleted ?? 0), 0);
  const totalQuizzes = merged.reduce((s, e) => s + (e.quizzesTaken ?? 0), 0);
  const totalGames   = merged.reduce((s, e) => s + (e.gamesPlayed ?? 0), 0);
  const highRisk     = merged.filter(e => e.riskLevel === 'high').length;

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null;
    return sortAsc
      ? <ChevronUp className="w-3.5 h-3.5 inline ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 inline ml-1" />;
  }

  const isLoading = empLoading || progLoading;

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-400" />
          User Activity
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track employee learning progress and risk scores across your company
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}    label="Total Employees" value={employees.length} color="bg-blue-600"   delay={0} />
        <StatCard icon={Video}    label="Videos Completed" value={totalVideos}     color="bg-green-600"  delay={0.05} />
        <StatCard icon={Brain}    label="Quizzes Taken"   value={totalQuizzes}    color="bg-purple-600" delay={0.1} />
        <StatCard icon={Gamepad2} label="Games Played"    value={totalGames}      color="bg-orange-600" delay={0.15} />
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Search by name, email or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Risk filter */}
        <div className="flex gap-2">
          {(['all', 'high', 'medium', 'low'] as const).map(f => (
            <button
              key={f}
              onClick={() => setRiskFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${
                riskFilter === f
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {f === 'all' ? 'All' : f}
              {f === 'high' && highRisk > 0 && (
                <span className="ml-1 text-red-400">({highRisk})</span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-700/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No employees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {[
                      { key: 'name',             label: 'Employee' },
                      { key: 'riskScore',         label: 'Risk' },
                      { key: 'points',            label: 'Points' },
                      { key: 'videosCompleted',   label: 'Videos' },
                      { key: 'quizzesTaken',      label: 'Quizzes' },
                      { key: 'gamesPlayed',       label: 'Games' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key as SortKey)}
                        className="px-5 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-semibold cursor-pointer hover:text-slate-300 transition-colors select-none"
                      >
                        {col.label}
                        <SortIcon k={col.key as SortKey} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp, i) => {
                    const risk = RISK_CONFIG[(emp.riskLevel as keyof typeof RISK_CONFIG) ?? 'low'] ?? RISK_CONFIG['low'];
                    return (
                      <motion.tr
                        key={emp._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20 transition-colors"
                      >
                        {/* Employee */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                              {emp.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-xs">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.department || 'General'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Risk */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${risk.class}`}>
                              <Shield className="w-3 h-3 mr-1" />
                              {risk.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {emp.riskScore ?? 0}
                            </span>
                          </div>
                        </td>

                        {/* Points */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="font-semibold text-foreground text-xs">
                              {emp.points ?? 0}
                            </span>
                          </div>
                        </td>

                        {/* Videos */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-slate-300 text-xs">{emp.videosCompleted ?? 0}</span>
                          </div>
                        </td>

                        {/* Quizzes */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-slate-300 text-xs">{emp.quizzesTaken ?? 0}</span>
                          </div>
                        </td>

                        {/* Games */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Gamepad2 className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-slate-300 text-xs">{emp.gamesPlayed ?? 0}</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}