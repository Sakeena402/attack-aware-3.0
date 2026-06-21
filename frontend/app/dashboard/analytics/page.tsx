'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/app/context/authContext';
import { analyticsApi, DashboardStats, SimulationAnalytics, DepartmentRisk } from '@/app/services/analyticsApi';
import { apiService } from '@/app/services/api';
import { StatCardSkeleton } from '@/components/ui/skeleton-loader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Mail, MessageSquare, Phone, Shield, AlertTriangle,
  TrendingDown, TrendingUp, Users, Target,
  XCircle, Activity, BarChart3, Zap, MousePointer,
  PhoneCall, Award, ChevronDown, ChevronUp, Info, Building2,
} from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-3 shadow-xl">
      {label && <p className="text-xs text-slate-400 mb-2 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-bold text-white">{p.value}{p.unit ?? ''}</span>
        </div>
      ))}
    </div>
  );
};

const RiskBadge = ({ score }: { score: number }) => {
  const cfg =
    score >= 36 ? { label: 'High',   cls: 'bg-red-500/20 text-red-400 border-red-500/30' } :
    score >= 16 ? { label: 'Medium', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' } :
                  { label: 'Low',    cls: 'bg-green-500/20 text-green-400 border-green-500/30' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const StatRow = ({ label, value, color = 'text-foreground', sub }: {
  label: string; value: string | number; color?: string; sub?: string;
}) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="text-right">
      <span className={`font-semibold text-sm ${color}`}>{value}</span>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  </div>
);

const ProgressBar = ({ value, max = 100, color }: {
  value: number; max?: number; color: string;
}) => (
  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
    <motion.div
      className="h-full rounded-full"
      style={{ background: color }}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      transition={{ duration: 1, ease: 'easeOut' }}
    />
  </div>
);

export default function AnalyticsPage() {
  const { state } = useAuth();
  const isSuperAdmin = state.user?.role === 'super_admin';
  const cid = isSuperAdmin ? undefined : state.user?.companyId;

  // ✅ Default to 'all' so all historical data shows on first load
  const [period,       setPeriod]       = useState('all');
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [activeTab,    setActiveTab]    = useState
    <'overview' | 'phishing' | 'smishing' | 'vishing' | 'companies'
  >('overview');

  // ── Data Fetching — period in SWR key triggers refetch on change ──────
  const { data: simData,  isLoading: simLoading }  = useSWR<SimulationAnalytics>(
    cid !== undefined ? `sim:${cid}:${period}` : `sim:all:${period}`,
    () => analyticsApi.getSimulations(cid, period),
    { revalidateOnFocus: false }
  );

  const { data: deptData, isLoading: deptLoading } = useSWR<DepartmentRisk[]>(
    cid !== undefined ? `dept:${cid}:${period}` : `dept:all:${period}`,
    () => analyticsApi.getDepartmentRisk(cid, period),
    { revalidateOnFocus: false }
  );

  const { data: dashData, isLoading: dashLoading } = useSWR<DashboardStats>(
    cid !== undefined ? `dash:${cid}:${period}` : `dash:all:${period}`,
    () => analyticsApi.getDashboard(cid, period),
    { revalidateOnFocus: false }
  );

  const { data: globalData, isLoading: globalLoading } = useSWR<any>(
    isSuperAdmin ? 'global-analytics' : null,
    async () => {
      const res = await apiService.get('/super-admin/analytics/global');
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const isLoading = simLoading || deptLoading || dashLoading;

  // ── Derived Data ───────────────────────────────────────────────────────
  const overviewCards = useMemo(() => [
    {
      label: 'Total Simulations',
      value: simData?.summary?.totalSimulations ?? 0,
      icon: Activity,
      color: 'purple',
      sub: `${dashData?.activeCampaigns ?? 0} active campaigns`,
    },
    {
      label: 'Phish-Prone Rate',
      value: `${(dashData as any)?.phishProneRate ?? dashData?.avgClickRate ?? 0}%`,
      icon: AlertTriangle,
      color: 'red',
      sub: ((dashData as any)?.phishProneRate ?? dashData?.avgClickRate ?? 0) >= 36
        ? '⚠️ Needs attention'
        : '✅ Under control',
    },
    {
      label: 'Threats Reported',
      value: simData?.summary?.totalReported ?? 0,
      icon: Shield,
      color: 'green',
      sub: `${dashData?.avgReportRate ?? 0}% report rate`,
    },
    {
      label: 'Compromised',
      value: simData?.summary?.totalCompromised ?? 0,
      icon: XCircle,
      color: 'orange',
      sub: `${dashData?.avgCompromiseRate ?? 0}% compromise rate`,
    },
  ], [simData, dashData]);

  const simTypeData = useMemo(() => simData ? [
    {
      type: 'Phishing',
      total:       simData.phishing.total,
      clicked:     simData.phishing.clicked,
      reported:    simData.phishing.reported,
      compromised: simData.phishing.compromised,
    },
    {
      type: 'Smishing',
      total:       simData.smishing.sent,
      clicked:     simData.smishing.clicked,
      reported:    simData.smishing.reported,
      compromised: simData.smishing.compromised,
    },
    {
      type: 'Vishing',
      total:       simData.vishing.initiated,
      clicked:     simData.vishing.engaged,
      reported:    simData.vishing.reported,
      compromised: 0,
    },
  ] : [], [simData]);

  const responsePie = useMemo(() => {
    if (!simData) return [];
    const total   = simData.summary.totalSimulations;
    const comp    = simData.summary.totalCompromised;
    const rep     = simData.summary.totalReported;
    const clicked = (
      simData.phishing.clicked +
      simData.smishing.clicked +
      simData.vishing.engaged
    ) - comp;
    const safe = Math.max(0, total - comp - rep - clicked);
    return [
      { name: 'Safe / Ignored', value: safe,                  color: '#10b981' },
      { name: 'Reported',       value: rep,                   color: '#8b5cf6' },
      { name: 'Clicked Only',   value: Math.max(0, clicked),  color: '#f59e0b' },
      { name: 'Compromised',    value: comp,                  color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [simData]);

  const smishFunnel = useMemo(() => simData?.smishing ? [
    { stage: 'Sent',        value: simData.smishing.sent,        fill: '#6366f1' },
    { stage: 'Delivered',   value: simData.smishing.delivered,   fill: '#8b5cf6' },
    { stage: 'Clicked',     value: simData.smishing.clicked,     fill: '#f59e0b' },
    { stage: 'Compromised', value: simData.smishing.compromised, fill: '#ef4444' },
    { stage: 'Reported',    value: simData.smishing.reported,    fill: '#10b981' },
  ] : [], [simData]);

  const vishFunnel = useMemo(() => simData?.vishing ? [
    { stage: 'Initiated', value: simData.vishing.initiated, fill: '#3b82f6' },
    { stage: 'Answered',  value: simData.vishing.answered,  fill: '#06b6d4' },
    { stage: 'Engaged',   value: simData.vishing.engaged,   fill: '#f59e0b' },
    { stage: 'Reported',  value: simData.vishing.reported,  fill: '#10b981' },
  ] : [], [simData]);

  const radarData = useMemo(() => simData ? [
    {
      metric: 'Click Rate',
      Phishing: simData.phishing.clickRate,
      Smishing: simData.smishing.clickRate,
      Vishing:  simData.vishing.engagementRate,
    },
    {
      metric: 'Report Rate',
      Phishing: simData.phishing.reportRate,
      Smishing: simData.smishing.reportRate,
      Vishing:  simData.vishing.reportRate,
    },
    {
      metric: 'Compromise',
      Phishing: simData.phishing.compromiseRate,
      Smishing: simData.smishing.compromiseRate,
      Vishing:  0,
    },
    {
      metric: 'Answer/Deliver',
      Phishing: 0,
      Smishing: simData.smishing.deliveryRate,
      Vishing:  simData.vishing.answerRate,
    },
  ] : [], [simData]);

  const kpis = useMemo(() => dashData ? [
    {
      label: 'Phish-Prone Rate',
      value: (dashData as any).phishProneRate ?? dashData.avgClickRate,
      unit: '%', good: false, threshold: 15,
      icon: MousePointer, desc: 'Industry target: below 15%',
    },
    {
      label: 'Avg Report Rate',
      value: dashData.avgReportRate,
      unit: '%', good: true, threshold: 25,
      icon: Shield, desc: 'Industry target: above 25%',
    },
    {
      label: 'Compromise Rate',
      value: dashData.avgCompromiseRate,
      unit: '%', good: false, threshold: 10,
      icon: AlertTriangle, desc: 'Industry target: below 10%',
    },
    {
      label: 'Training Progress',
      value: dashData.trainingProgress,
      unit: '%', good: true, threshold: 50,
      icon: Award, desc: 'Target: 50%+ employees reported threats',
    },
  ] : [], [dashData]);

  const tabs = [
    { key: 'overview',  label: 'Overview',   icon: BarChart3 },
    { key: 'phishing',  label: 'Phishing',   icon: Mail },
    { key: 'smishing',  label: 'Smishing',   icon: MessageSquare },
    { key: 'vishing',   label: 'Vishing',    icon: Phone },
    ...(isSuperAdmin ? [{ key: 'companies', label: 'By Company', icon: Building2 }] : []),
  ];

  // ✅ Period options — All added as first option
  const periodOptions = [
    { key: 'all',     label: 'All'     },
    { key: 'week',    label: 'Week'    },
    { key: 'month',   label: 'Month'   },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year',    label: 'Year'    },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isSuperAdmin ? 'Global Analytics' : 'Analytics & Reports'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isSuperAdmin
                ? 'Security awareness metrics across ALL companies on the platform'
                : 'Comprehensive security awareness metrics across all simulation types'}
            </p>
          </div>

          {/* ✅ Period Filter — now includes All button */}
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1 border border-purple-500/20">
            {periodOptions.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === p.key
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period indicator */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Showing:
          </span>
          <span className="text-xs text-purple-400 font-medium">
            {period === 'all'
              ? 'All time data'
              : period === 'week'    ? 'Last 7 days'
              : period === 'month'   ? 'Last 30 days'
              : period === 'quarter' ? 'Last 90 days'
              : 'Last 365 days'
            }
          </span>
        </div>

        {isSuperAdmin && (
          <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Showing data across all {globalData?.totalCompanies || '...'} companies on the platform
          </div>
        )}
      </motion.div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : overviewCards.map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label} className="p-5 border border-slate-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-slate-700/50">
                  <Icon className="w-5 h-5 text-slate-300" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
              {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
            </Card>
          ))
        }
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 border border-purple-500/10 w-fit flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ════ OVERVIEW TAB ════ */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" /> Simulation Type Comparison
                </h2>
                {simLoading ? (
                  <div className="h-64 bg-slate-700 rounded animate-pulse" />
                ) : simTypeData.every(d => d.total === 0) ? (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No simulation data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={simTypeData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="type" stroke="#64748b" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="total"       name="Sent/Initiated" fill="#6366f1" radius={[4,4,0,0]} />
                      <Bar dataKey="clicked"     name="Clicked"        fill="#f59e0b" radius={[4,4,0,0]} />
                      <Bar dataKey="reported"    name="Reported"       fill="#10b981" radius={[4,4,0,0]} />
                      <Bar dataKey="compromised" name="Compromised"    fill="#ef4444" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" /> Rate Comparison Radar
                </h2>
                {simLoading ? (
                  <div className="h-64 bg-slate-700 rounded animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Radar name="Phishing" dataKey="Phishing" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
                      <Radar name="Smishing" dataKey="Smishing" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                      <Radar name="Vishing"  dataKey="Vishing"  stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                      <Legend />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" /> Overall Response Distribution
                </h2>
                {simLoading ? (
                  <div className="h-64 bg-slate-700 rounded animate-pulse" />
                ) : responsePie.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    No data for this period
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={220}>
                      <PieChart>
                        <Pie
                          data={responsePie}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={90}
                          dataKey="value" paddingAngle={3}
                          label={({ percent }) =>
                            percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ''
                          }
                          labelLine={false}
                        >
                          {responsePie.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-3">
                      {responsePie.map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                              <span className="text-slate-300">{item.name}</span>
                            </div>
                            <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                          </div>
                          <ProgressBar
                            value={item.value}
                            max={simData?.summary?.totalSimulations ?? 1}
                            color={item.color}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" /> Key Performance Indicators
                </h2>
                {dashLoading ? (
                  <div className="h-64 bg-slate-700 rounded animate-pulse" />
                ) : (
                  <div className="space-y-4">
                    {kpis.map(({ label, value, unit, good, threshold, icon: Icon, desc }) => {
                      const isGood   = good ? value >= threshold : value <= threshold;
                      const barColor = isGood
                        ? '#10b981'
                        : value >= threshold * 1.5 ? '#ef4444' : '#f59e0b';
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-300">{label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm" style={{ color: barColor }}>
                                {typeof value === 'number' ? value.toFixed(1) : value}{unit}
                              </span>
                              {isGood
                                ? <TrendingUp   className="w-3 h-3 text-green-400" />
                                : <TrendingDown className="w-3 h-3 text-red-400"   />
                              }
                            </div>
                          </div>
                          <ProgressBar value={value as number} max={100} color={barColor} />
                          <p className="text-xs text-slate-500 mt-1">{desc}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        )}

        {/* ════ PHISHING TAB ════ */}
        {activeTab === 'phishing' && (
          <motion.div
            key="phishing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Sent',  value: simData?.phishing.total       ?? 0, color: 'text-purple-400' },
                { label: 'Clicked',     value: simData?.phishing.clicked      ?? 0, color: 'text-red-400'    },
                { label: 'Compromised', value: simData?.phishing.compromised  ?? 0, color: 'text-orange-400' },
                { label: 'Reported',    value: simData?.phishing.reported     ?? 0, color: 'text-green-400'  },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-4 rounded-xl border border-slate-700">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 surface-1 rounded-xl border border-red-500/20">
                <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-red-400" /> Phishing Rate Summary
                </h2>
                <div className="space-y-5">
                  {[
                    { label: 'Phish-Prone Rate (Click)', value: simData?.phishing.clickRate      ?? 0, color: '#ef4444', good: false },
                    { label: 'Compromise Rate',          value: simData?.phishing.compromiseRate ?? 0, color: '#f97316', good: false },
                    { label: 'Report Rate',              value: simData?.phishing.reportRate     ?? 0, color: '#10b981', good: true  },
                  ].map(({ label, value, color, good }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300">{label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold" style={{ color }}>{value}%</span>
                          {good
                            ? <TrendingUp   className="w-3 h-3 text-green-400" />
                            : <TrendingDown className="w-3 h-3 text-red-400"   />
                          }
                        </div>
                      </div>
                      <ProgressBar value={value} color={color} />
                    </div>
                  ))}
                </div>
                <div className="mt-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-300">
                      {(simData?.phishing.clickRate ?? 0) >= 36
                        ? 'High phish-prone rate (36%+). Immediate targeted training recommended.'
                        : (simData?.phishing.clickRate ?? 0) >= 16
                        ? 'Medium phish-prone rate. Continue awareness campaigns.'
                        : 'Low phish-prone rate — below industry benchmark of 15%. Great work!'
                      }
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 surface-1 rounded-xl border border-red-500/20">
                <h2 className="text-lg font-bold text-foreground mb-4">Email Phishing Breakdown</h2>
                {simLoading ? (
                  <div className="h-52 bg-slate-700 rounded animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={[
                      { name: 'Total',       value: simData?.phishing.total       ?? 0, fill: '#6366f1' },
                      { name: 'Clicked',     value: simData?.phishing.clicked     ?? 0, fill: '#ef4444' },
                      { name: 'Compromised', value: simData?.phishing.compromised ?? 0, fill: '#f97316' },
                      { name: 'Reported',    value: simData?.phishing.reported    ?? 0, fill: '#10b981' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[6,6,0,0]}>
                        {[0,1,2,3].map((_, i) => (
                          <Cell key={i} fill={['#6366f1','#ef4444','#f97316','#10b981'][i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          </motion.div>
        )}

        {/* ════ SMISHING TAB ════ */}
        {activeTab === 'smishing' && (
          <motion.div
            key="smishing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'SMS Sent',    value: simData?.smishing.sent        ?? 0, color: 'text-purple-400' },
                { label: 'Delivered',   value: simData?.smishing.delivered   ?? 0, color: 'text-blue-400'   },
                { label: 'Clicked',     value: simData?.smishing.clicked     ?? 0, color: 'text-yellow-400' },
                { label: 'Compromised', value: simData?.smishing.compromised ?? 0, color: 'text-red-400'    },
                { label: 'Reported',    value: simData?.smishing.reported    ?? 0, color: 'text-green-400'  },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-4 rounded-xl border border-slate-700">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 surface-1 rounded-xl border border-yellow-500/20">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-yellow-400" /> SMS Campaign Funnel
                </h2>
                {simLoading ? (
                  <div className="h-56 bg-slate-700 rounded animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={smishFunnel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="stage" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Count" radius={[6,6,0,0]}>
                        {smishFunnel.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-6 surface-1 rounded-xl border border-yellow-500/20">
                <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-yellow-400" /> Smishing Rate Breakdown
                </h2>
                <div className="space-y-5">
                  {[
                    { label: 'Delivery Rate',   value: simData?.smishing.deliveryRate   ?? 0, color: '#6366f1', desc: 'of SMS messages reached recipients' },
                    { label: 'Click Rate',       value: simData?.smishing.clickRate      ?? 0, color: '#f59e0b', desc: 'of delivered messages were clicked' },
                    { label: 'Compromise Rate', value: simData?.smishing.compromiseRate ?? 0, color: '#ef4444', desc: 'of clickers submitted credentials' },
                    { label: 'Report Rate',      value: simData?.smishing.reportRate     ?? 0, color: '#10b981', desc: 'identified and reported the attempt' },
                  ].map(({ label, value, color, desc }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{label}</span>
                        <span className="font-bold" style={{ color }}>{value}%</span>
                      </div>
                      <ProgressBar value={value} color={color} />
                      <p className="text-xs text-slate-500 mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ════ VISHING TAB ════ */}
        {activeTab === 'vishing' && (
          <motion.div
            key="vishing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Calls Initiated', value: simData?.vishing.initiated ?? 0, color: 'text-blue-400'   },
                { label: 'Answered',        value: simData?.vishing.answered  ?? 0, color: 'text-cyan-400'   },
                { label: 'Engaged (Risk)',  value: simData?.vishing.engaged   ?? 0, color: 'text-yellow-400' },
                { label: 'Reported',        value: simData?.vishing.reported  ?? 0, color: 'text-green-400'  },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-4 rounded-xl border border-slate-700">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 surface-1 rounded-xl border border-blue-500/20">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-400" /> Voice Call Funnel
                </h2>
                {simLoading ? (
                  <div className="h-56 bg-slate-700 rounded animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={vishFunnel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="stage" stroke="#64748b" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Count" radius={[6,6,0,0]}>
                        {vishFunnel.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-6 surface-1 rounded-xl border border-blue-500/20">
                <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-blue-400" /> Vishing Rate Breakdown
                </h2>
                <div className="space-y-5">
                  {[
                    { label: 'Answer Rate',     value: simData?.vishing.answerRate     ?? 0, color: '#06b6d4', desc: 'of initiated calls were answered' },
                    { label: 'Engagement Rate', value: simData?.vishing.engagementRate ?? 0, color: '#f59e0b', desc: 'of answered calls led to engagement' },
                    { label: 'Report Rate',      value: simData?.vishing.reportRate     ?? 0, color: '#10b981', desc: 'correctly identified as suspicious' },
                  ].map(({ label, value, color, desc }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{label}</span>
                        <span className="font-bold" style={{ color }}>{value}%</span>
                      </div>
                      <ProgressBar value={value} color={color} />
                      <p className="text-xs text-slate-500 mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-300">
                      {(simData?.vishing.engagementRate ?? 0) >= 36
                        ? 'High engagement rate. Employees highly susceptible to voice social engineering.'
                        : 'Engagement rate is within acceptable range. Continue vishing awareness training.'
                      }
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ════ COMPANIES TAB — Super Admin Only ════ */}
        {activeTab === 'companies' && isSuperAdmin && (
          <motion.div
            key="companies"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Companies',      value: globalData?.totalCompanies   ?? 0,               color: 'text-purple-400' },
                { label: 'Total Employees',      value: globalData?.totalEmployees   ?? 0,               color: 'text-blue-400'   },
                { label: 'Total Simulations',    value: globalData?.totalSimulations ?? 0,               color: 'text-cyan-400'   },
                { label: 'Platform Phish-Prone', value: `${globalData?.globalClickRate ?? 0}%`,
                  color: (globalData?.globalClickRate ?? 0) >= 36 ? 'text-red-400'
                       : (globalData?.globalClickRate ?? 0) >= 16 ? 'text-yellow-400'
                       : 'text-green-400',
                },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-4 rounded-xl border border-purple-500/20">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </Card>
              ))}
            </div>

            <Card className="p-6 surface-1 rounded-xl border border-purple-500/20">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" /> Per-Company Overview
              </h2>
              {globalLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-2 text-slate-400 font-medium">Company</th>
                        <th className="text-left py-3 px-2 text-slate-400 font-medium">Industry</th>
                        <th className="text-center py-3 px-2 text-slate-400 font-medium">Plan</th>
                        <th className="text-center py-3 px-2 text-slate-400 font-medium">Employees</th>
                        <th className="text-center py-3 px-2 text-slate-400 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(globalData?.companies || []).map((company: any) => (
                        <tr key={company._id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition">
                          <td className="py-3 px-2">
                            <p className="font-medium text-foreground">{company.companyName}</p>
                          </td>
                          <td className="py-3 px-2 text-slate-400">{company.industry || '—'}</td>
                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 capitalize">
                              {company.plan || 'basic'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center text-slate-300">{company.employeeCount || 0}</td>
                          <td className="py-3 px-2 text-center text-slate-400 text-xs">
                            {new Date(company.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!globalData?.companies || globalData.companies.length === 0) && (
                    <p className="text-center text-slate-400 py-8">No companies registered yet</p>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Department Risk */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-orange-500/20">
          <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" /> Department Risk Analysis
          </h2>
          {isSuperAdmin && (
            <p className="text-xs text-slate-400 mb-4">Aggregated across all companies</p>
          )}

          {deptLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-700 rounded animate-pulse" />)}
            </div>
          ) : deptData && deptData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={deptData.slice(0, 6).map(d => ({
                    name: d.department, risk: d.avgRiskScore,
                    click: d.clickRate, report: d.reportRate,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="risk" name="Risk Score" radius={[0,4,4,0]}>
                    {deptData.slice(0, 6).map((d, i) => (
                      <Cell key={i} fill={
                        d.avgRiskScore >= 36 ? '#ef4444' :
                        d.avgRiskScore >= 16 ? '#f59e0b' :
                        '#10b981'
                      } />
                    ))}
                  </Bar>
                  <Bar dataKey="click"  name="Click %"  fill="#f59e0b" radius={[0,4,4,0]} fillOpacity={0.6} />
                  <Bar dataKey="report" name="Report %" fill="#10b981" radius={[0,4,4,0]} fillOpacity={0.6} />
                </BarChart>
              </ResponsiveContainer>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {deptData.map((dept, i) => (
                  <div key={i} className="rounded-xl border border-slate-700 overflow-hidden">
                    <button
                      onClick={() => setExpandedDept(
                        expandedDept === dept.department ? null : dept.department
                      )}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          dept.avgRiskScore >= 36 ? 'bg-red-500' :
                          dept.avgRiskScore >= 16 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <span className="font-medium text-foreground text-sm">{dept.department}</span>
                        <RiskBadge score={dept.avgRiskScore} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-sm ${
                          dept.avgRiskScore >= 36 ? 'text-red-400' :
                          dept.avgRiskScore >= 16 ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {dept.avgRiskScore}
                        </span>
                        {expandedDept === dept.department
                          ? <ChevronUp   className="w-4 h-4 text-slate-400" />
                          : <ChevronDown className="w-4 h-4 text-slate-400" />
                        }
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedDept === dept.department && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-700 bg-slate-800/50"
                        >
                          <div className="p-3 space-y-1">
                            <StatRow label="Employees"       value={dept.employees}           />
                            <StatRow label="Simulations"     value={dept.totalSims}            />
                            <StatRow label="Phish-Prone %"   value={`${dept.clickRate}%`}      color="text-yellow-400" />
                            <StatRow label="Report Rate"     value={`${dept.reportRate}%`}     color="text-green-400"  />
                            <StatRow label="Compromise Rate" value={`${dept.compromiseRate}%`} color="text-red-400"    />
                            <StatRow label="High Risk"       value={dept.highRiskCount}        color="text-red-400"    />
                            <StatRow label="Medium Risk"     value={dept.mediumRiskCount}      color="text-yellow-400" />
                            <StatRow label="Low Risk"        value={dept.lowRiskCount}         color="text-green-400"  />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">No department data available yet</p>
              <p className="text-slate-500 text-sm mt-1">
                {period !== 'all'
                  ? `No data found for this period. Try selecting "All" to see all-time data.`
                  : 'Launch campaigns to generate department insights'
                }
              </p>
            </div>
          )}
        </Card>
      </motion.div>

    </div>
  );
}