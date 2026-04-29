// frontend/app/dashboard/campaigns/[id]/results/page.tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { campaignReportsApi, CampaignDetailedResults } from '@/app/services/campaignReportsApi';
import {
  Download, Users, MousePointer, Shield, XCircle, CheckCircle,
  AlertTriangle, TrendingUp, TrendingDown, Filter, Eye, EyeOff,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const ACTION_CONFIG = {
  compromised: { label: 'Compromised',  icon: XCircle,        color: '#ef4444', bg: 'bg-red-500/10' },
  clicked:     { label: 'Clicked Only', icon: MousePointer,   color: '#f59e0b', bg: 'bg-yellow-500/10' },
  reported:    { label: 'Reported',     icon: Shield,         color: '#10b981', bg: 'bg-green-500/10' },
  engaged:     { label: 'Engaged',      icon: AlertTriangle,  color: '#f97316', bg: 'bg-orange-500/10' },
  ignored:     { label: 'No Action',    icon: EyeOff,         color: '#64748b', bg: 'bg-slate-500/10' },
  received_no_action: { label: 'Received', icon: Eye,        color: '#64748b', bg: 'bg-slate-500/10' },
};

export default function CampaignResultsPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [filterAction,     setFilterAction]     = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterRiskLevel,  setFilterRiskLevel]  = useState<string>('all');

  const { data, isLoading } = useSWR<CampaignDetailedResults>(
    campaignId ? `campaign-results:${campaignId}` : null,
    () => campaignReportsApi.getCampaignResults(campaignId),
    { revalidateOnFocus: false }
  );

  const handleDownloadPDF = async () => {
    await campaignReportsApi.downloadCampaignPDF(campaignId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Campaign not found</p>
      </div>
    );
  }

  // Apply filters
  const filteredUsers = data.userActions.filter(u => {
    if (filterAction !== 'all'     && u.action !== filterAction)       return false;
    if (filterDepartment !== 'all' && u.department !== filterDepartment) return false;
    if (filterRiskLevel !== 'all'  && u.riskLevel !== filterRiskLevel)  return false;
    return true;
  });

  const departments = ['all', ...Array.from(new Set(data.userActions.map(u => u.department)))];
  const actionPieData = [
    { name: 'Compromised', value: data.byAction.compromised.length, color: '#ef4444' },
    { name: 'Clicked',     value: data.byAction.clicked.length,     color: '#f59e0b' },
    { name: 'Reported',    value: data.byAction.reported.length,    color: '#10b981' },
    { name: 'Ignored',     value: data.byAction.ignored.length,     color: '#64748b' },
  ];

  const deptBarData = Object.entries(data.byDepartment).map(([dept, stats]) => ({
    name: dept, clickRate: stats.clickRate, reportRate: stats.reportRate,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaign Results</h1>
          <p className="text-muted-foreground mt-1">
            {data.campaign.name} · {data.campaign.type} · {data.campaign.status}
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition"
        >
          <Download className="w-4 h-4" />
          Download PDF Report
        </button>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Targeted', value: data.summary.totalTargeted, icon: Users,       color: 'purple' },
          { label: 'Click Rate',     value: `${data.summary.clickRate}%`, icon: MousePointer, color: 'yellow' },
          { label: 'Compromise Rate',value: `${data.summary.compromiseRate}%`, icon: XCircle, color: 'red' },
          { label: 'Report Rate',    value: `${data.summary.reportRate}%`, icon: Shield,      color: 'green' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className={`p-4 bg-gradient-to-br from-${color}-500/10 to-transparent border-${color}-500/20`}>
            <div className={`p-2 rounded-lg bg-${color}-500/20 w-fit mb-2`}><Icon className={`w-4 h-4 text-${color}-400`} /></div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Action Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={actionPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                dataKey="value" paddingAngle={3}
                label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
              >
                {actionPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Department Performance</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deptBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="clickRate"  name="Click %"  fill="#f59e0b" radius={[4,4,0,0]} />
              <Bar dataKey="reportRate" name="Report %" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-medium text-foreground">Filters:</span>

          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-foreground"
          >
            <option value="all">All Actions</option>
            {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-foreground"
          >
            {departments.map(d => (
              <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
            ))}
          </select>

          <select value={filterRiskLevel} onChange={e => setFilterRiskLevel(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-foreground"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          <span className="ml-auto text-sm text-slate-400">
            Showing {filteredUsers.length} of {data.userActions.length} users
          </span>
        </div>
      </Card>

      {/* User Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                {['Employee', 'Department', 'Action', 'Risk', 'Details', 'Timestamp'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, i) => {
                const cfg = ACTION_CONFIG[user.action as keyof typeof ACTION_CONFIG] ?? ACTION_CONFIG.ignored;
                const Icon = cfg.icon;
                return (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-sm">{user.userName}</p>
                      <p className="text-xs text-slate-500">{user.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{user.department}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${cfg.bg}`}>
                          <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        user.riskLevel === 'high'   ? 'bg-red-500/20 text-red-400' :
                        user.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                      'bg-green-500/20 text-green-400'
                      }`}>
                        {user.riskScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{user.actionDetail}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {user.actionTime ? new Date(user.actionTime).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}