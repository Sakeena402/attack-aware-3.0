// frontend/app/dashboard/admin/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/authContext';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton-loader';
import { useToast } from '@/components/ui/toast-notification';
import {
  Users, BarChart3, AlertTriangle, TrendingUp, TrendingDown,
  Zap, Target, Activity, Trophy, Shield, Mail, MessageSquare, Phone,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import {
  analyticsApi, DashboardStats, DepartmentRisk, SimulationAnalytics,
} from '@/app/services/analyticsApi';
import { campaignApi }    from '@/app/services/campaignApi';
import { leaderboardApi } from '@/app/services/leaderboardApi';
import type { Campaign, LeaderboardEntry } from '@/app/services/types';

const RISK_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const TYPE_COLORS = { phishing: '#ef4444', smishing: '#f59e0b', vishing: '#3b82f6' };

// Small stat card used in tables and metric blocks
function StatBadge({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className={`text-center p-3 rounded-lg bg-${color}-500/10 border border-${color}-500/20`}>
      <p className={`text-xl font-bold text-${color}-400`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { state }            = useAuth();
  const { error: showError } = useToast();
  const [deptFilter, setDeptFilter] = useState('all');

  if (state.user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Access Denied: Admin role required</p>
      </div>
    );
  }

  const cid = state.user.companyId;

  const { data: dash,      isLoading: dashLoading }  = useSWR<DashboardStats>(
    cid ? `dash:${cid}`  : null,
    () => analyticsApi.getDashboard(cid),
    { onError: () => showError('Failed to load dashboard stats') }
  );
  const { data: simData,   isLoading: simLoading }   = useSWR<SimulationAnalytics>(
    cid ? `sim:${cid}`   : null,
    () => analyticsApi.getSimulations(cid),
    { revalidateOnFocus: false }
  );
  const { data: deptRisk = [], isLoading: deptLoading } = useSWR<DepartmentRisk[]>(
    cid ? `dept:${cid}`  : null,
    () => analyticsApi.getDepartmentRisk(cid),
    { revalidateOnFocus: false }
  );
  const { data: campaigns = [], isLoading: campLoading } = useSWR<Campaign[]>(
    cid ? `campaigns:${cid}` : null,
    () => campaignApi.getAll(cid),
    { revalidateOnFocus: false }
  );
  const { data: leaderboard = [], isLoading: lbLoading } = useSWR<LeaderboardEntry[]>(
    cid ? ['lb', cid]    : null,
    () => leaderboardApi.getAll({ companyId: cid, limit: 5 }),
    { revalidateOnFocus: false }
  );

  const riskPie = dash ? [
    { name: 'High',   value: dash.riskDistribution.high,   color: RISK_COLORS.high },
    { name: 'Medium', value: dash.riskDistribution.medium, color: RISK_COLORS.medium },
    { name: 'Low',    value: dash.riskDistribution.low,    color: RISK_COLORS.low },
  ] : [];

  const simTypeBar = simData ? [
    { name: 'Phishing', total: simData.phishing.total, clicked: simData.phishing.clicked, reported: simData.phishing.reported, compromised: simData.phishing.compromised },
    { name: 'Smishing', total: simData.smishing.sent,  clicked: simData.smishing.clicked, reported: simData.smishing.reported, compromised: simData.smishing.compromised },
    { name: 'Vishing',  total: simData.vishing.initiated, clicked: simData.vishing.engaged, reported: simData.vishing.reported, compromised: 0 },
  ] : [];

  const deptChart = deptRisk
    .filter(d => deptFilter === 'all' || d.department === deptFilter)
    .map(d => ({ name: d.department, risk: d.avgRiskScore, click: d.clickRate, report: d.reportRate }));

  const deptOptions = ['all', ...deptRisk.map(d => d.department)];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Company Dashboard</h1>
        <p className="text-muted-foreground mt-1">Security awareness metrics for your organisation</p>
      </motion.div>

      {/* ── Top Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashLoading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            {[
              { label: 'Employees',       value: dash?.totalEmployees ?? 0,        icon: Users,          color: 'purple' },
              { label: 'Active Campaigns',value: dash?.activeCampaigns ?? 0,        icon: Zap,            color: 'blue' },
              { label: 'Avg Click Rate',  value: `${dash?.avgClickRate ?? 0}%`,    icon: Target,         color: 'red' },
              { label: 'Avg Report Rate', value: `${dash?.avgReportRate ?? 0}%`,   icon: Shield,         color: 'green' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className={`p-4 bg-gradient-to-br from-${color}-500/10 to-transparent border-${color}-500/20`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${color}-500/20`}><Icon className={`w-5 h-5 text-${color}-400`} /></div>
                  <div><p className="text-2xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* ── Secondary Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashLoading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <Card className="p-4 border-slate-700">
              <p className="text-xs text-muted-foreground mb-1">Total Simulations</p>
              <p className="text-2xl font-bold text-foreground">{dash?.totalSimulations ?? 0}</p>
            </Card>
            <Card className="p-4 border-yellow-500/20">
              <p className="text-xs text-muted-foreground mb-1">Total Clicks</p>
              <p className="text-2xl font-bold text-yellow-400">{dash?.totalClicks ?? 0}</p>
            </Card>
            <Card className="p-4 border-red-500/20">
              <p className="text-xs text-muted-foreground mb-1">Compromised</p>
              <p className="text-2xl font-bold text-red-400">{dash?.totalCompromised ?? 0}</p>
            </Card>
            <Card className="p-4 border-green-500/20">
              <p className="text-xs text-muted-foreground mb-1">Total Reports</p>
              <p className="text-2xl font-bold text-green-400">{dash?.totalReports ?? 0}</p>
            </Card>
          </>
        )}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulation Type Comparison */}
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <h2 className="text-lg font-bold text-foreground mb-4">Simulation Type Breakdown</h2>
          {simLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={simTypeBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="total"      name="Sent/Initiated" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="clicked"    name="Clicked/Engaged" fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="reported"   name="Reported"       fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="compromised" name="Compromised"   fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Risk Distribution Pie */}
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <h2 className="text-lg font-bold text-foreground mb-4">Employee Risk Distribution</h2>
          {dashLoading ? <ChartSkeleton /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={riskPie} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                  >
                    {riskPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {riskPie.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name} Risk</p>
                      <p className="text-xs text-muted-foreground">{item.value} employees</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-700 text-xs text-muted-foreground">
                  <p>Compromise rate: <span className="text-red-400 font-medium">{dash?.avgCompromiseRate ?? 0}%</span></p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Department Risk ── */}
      <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-foreground">Department Risk Analysis</h2>
          <div className="flex gap-2 flex-wrap">
            {deptOptions.map(d => (
              <button key={d} onClick={() => setDeptFilter(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  deptFilter === d
                    ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                    : 'bg-slate-700 text-slate-400 hover:text-foreground'
                }`}
              >
                {d === 'all' ? 'All Departments' : d}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          {deptLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" stroke="#64748b" width={90} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="risk"   name="Risk Score"  radius={[0,4,4,0]}>
                  {deptChart.map((d, i) => (
                    <Cell key={i} fill={d.risk >= 36 ? '#ef4444' : d.risk >= 16 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
                <Bar dataKey="click"  name="Click Rate"  fill="#f59e0b" radius={[0,4,4,0]} />
                <Bar dataKey="report" name="Report Rate" fill="#10b981" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Department Table */}
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left pb-2 px-2">Dept</th>
                  <th className="text-center pb-2 px-2">Emp</th>
                  <th className="text-center pb-2 px-2">Sims</th>
                  <th className="text-center pb-2 px-2">Click%</th>
                  <th className="text-center pb-2 px-2">Report%</th>
                  <th className="text-center pb-2 px-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {(deptFilter === 'all' ? deptRisk : deptRisk.filter(d => d.department === deptFilter))
                  .map((d, i) => (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                      <td className="py-2 px-2 font-medium text-foreground">{d.department}</td>
                      <td className="py-2 px-2 text-center text-slate-300">{d.employees}</td>
                      <td className="py-2 px-2 text-center text-slate-300">{d.totalSims}</td>
                      <td className="py-2 px-2 text-center text-yellow-400">{d.clickRate}%</td>
                      <td className="py-2 px-2 text-center text-green-400">{d.reportRate}%</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          d.avgRiskScore >= 36 ? 'bg-red-500/20 text-red-400' :
d.avgRiskScore >= 16 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-4000'
                        }`}>
                          {d.avgRiskScore}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* ── Campaigns + Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Recent Campaigns</h2>
            <Activity className="text-purple-400" size={20} />
          </div>
          {campLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />)}</div>
          ) : campaigns.length > 0 ? (
            <div className="space-y-2">
              {campaigns.slice(0, 6).map(c => (
                <div key={c._id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
                  <div className="flex items-center gap-2">
                    {c.type === 'phishing' ? <Mail className="w-4 h-4 text-red-400" /> :
                     c.type === 'smishing' ? <MessageSquare className="w-4 h-4 text-yellow-400" /> :
                                             <Phone className="w-4 h-4 text-blue-400" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.campaignName}</p>
                      <p className="text-xs text-slate-400">{c.targetEmployees?.length ?? 0} targets</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      c.status === 'active'  ? 'bg-green-500/20 text-green-400' :
                      c.status === 'paused'  ? 'bg-yellow-500/20 text-yellow-400' :
                                              'bg-slate-500/20 text-slate-400'
                    }`}>{c.status}</span>
                    <p className="text-xs text-slate-400 mt-1">Click: {c.clickRate?.toFixed(1) ?? 0}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm">No campaigns yet</p>}
        </Card>

        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Top Performers</h2>
            <Trophy className="text-yellow-400" size={20} />
          </div>
          {lbLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />)}</div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((e, i) => (
                <div key={e._id?.toString() ?? i} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      i === 1 ? 'bg-gray-400/20 text-gray-300' :
                      i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-600 text-slate-300'
                    }`}>{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.userName ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{e.department ?? 'N/A'} · {e.badge ?? 'Rookie'}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-purple-400">{e.score} pts</span>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm">No leaderboard data yet</p>}
        </Card>
      </div>
    </div>
  );
}