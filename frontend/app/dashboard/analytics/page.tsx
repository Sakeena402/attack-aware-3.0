'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import type { DashboardStats, Campaign, LeaderboardEntry } from '@/app/services/types';
import {simulationAnalyticsApi} from '@/app/services/simulationAnalyticsApi';
import { StatCardSkeleton } from '@/components/ui/skeleton-loader';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  Mail,
  MessageSquare,
  Phone,
  Shield,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
} from 'lucide-react';

const fetcher = async (url: string) => {
  const response = await  apiService.get(url);
  return response.data;
};

const COLORS = {
  safe: '#10b981',
  clicked: '#f59e0b',
  compromised: '#ef4444',
  reported: '#8b5cf6',
  phishing: '#ef4444',
  smishing: '#f59e0b',
  vishing: '#3b82f6',
};

export default function AnalyticsPage() {
  const { state } = useAuth();
  const [period, setPeriod] = useState('month');

  // Fetch simulation analytics
  const { data: simData, isLoading: simLoading } = useSWR(
    state.user?.companyId 
      ? `/analytics/simulations?companyId=${state.user.companyId}` 
      : '/analytics/simulations',
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch department risk data
  const { data: deptData, isLoading: deptLoading } = useSWR(
    state.user?.companyId 
      ? `/analytics/department-risk?companyId=${state.user.companyId}` 
      : '/analytics/department-risk',
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch dashboard stats
  const { data: dashStats, isLoading: dashLoading } = useSWR(
    state.user?.companyId 
      ? `/analytics/dashboard?companyId=${state.user.companyId}` 
      : '/analytics/dashboard',
    fetcher,
    { revalidateOnFocus: false }
  );

  const isLoading = simLoading || deptLoading || dashLoading;

  // Process data for charts
  const simulationTypeData = simData ? [
    { 
      name: 'Email Phishing', 
      total: simData.phishing?.total || 0,
      clicked: simData.phishing?.clicked || 0,
      reported: simData.phishing?.reported || 0,
      color: COLORS.phishing 
    },
    { 
      name: 'SMS (Smishing)', 
      total: simData.smishing?.sent || 0,
      clicked: simData.smishing?.clicked || 0,
      reported: simData.smishing?.reported || 0,
      color: COLORS.smishing 
    },
    { 
      name: 'Voice (Vishing)', 
      total: simData.vishing?.initiated || 0,
      clicked: simData.vishing?.engaged || 0,
      reported: simData.vishing?.reported || 0,
      color: COLORS.vishing 
    },
  ] : [];

  const responseDistribution = simData ? [
    { name: 'Safe', value: Math.max(0, (simData.summary?.totalSimulations || 0) - (simData.summary?.totalCompromised || 0) - (simData.summary?.totalReported || 0)), color: COLORS.safe },
    { name: 'Compromised', value: simData.summary?.totalCompromised || 0, color: COLORS.compromised },
    { name: 'Reported', value: simData.summary?.totalReported || 0, color: COLORS.reported },
  ] : [];

  const smishingFunnel = simData?.smishing ? [
    { name: 'Sent', value: simData.smishing.sent, fill: '#6366f1' },
    { name: 'Delivered', value: simData.smishing.delivered, fill: '#8b5cf6' },
    { name: 'Clicked', value: simData.smishing.clicked, fill: '#f59e0b' },
    { name: 'Compromised', value: simData.smishing.compromised, fill: '#ef4444' },
  ] : [];

  const vishingFunnel = simData?.vishing ? [
    { name: 'Initiated', value: simData.vishing.initiated, fill: '#3b82f6' },
    { name: 'Answered', value: simData.vishing.answered, fill: '#06b6d4' },
    { name: 'Engaged', value: simData.vishing.engaged, fill: '#f59e0b' },
    { name: 'Reported', value: simData.vishing.reported, fill: '#10b981' },
  ] : [];

  const departmentRisk = (deptData || []).slice(0, 6).map((d: any) => ({
    department: d.department,
    risk: d.avgRiskScore,
    employees: d.employees,
    highRisk: d.highRiskCount,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold font-poppins text-foreground">
          Analytics & Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive security awareness metrics across all simulation types
        </p>
      </motion.div>

      {/* Date Filter */}
      <div className="flex gap-2">
        {[
          { key: 'week', label: 'This Week' },
          { key: 'month', label: 'This Month' },
          { key: 'quarter', label: 'This Quarter' },
          { key: 'year', label: 'This Year' },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.key
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Overview Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {simData?.summary?.totalSimulations || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Simulations</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {simData?.summary?.overallRiskScore || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Overall Risk Score</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {simData?.summary?.totalReported || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Threats Reported</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashStats?.totalEmployees || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Employees Trained</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </motion.div>

      {/* Simulation Type Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Email Phishing */}
        <Card className="p-6 border-red-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Mail className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="font-semibold text-foreground">Email Phishing</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Simulations</span>
              <span className="font-semibold text-foreground">{simData?.phishing?.total || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Click Rate</span>
              <span className="font-semibold text-red-400">{simData?.phishing?.clickRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Report Rate</span>
              <span className="font-semibold text-green-400">{simData?.phishing?.reportRate || 0}%</span>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                {(simData?.phishing?.clickRate || 0) < 30 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Below average risk</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-red-400" />
                    <span className="text-red-400">Above average risk</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* SMS Smishing */}
        <Card className="p-6 border-yellow-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <MessageSquare className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="font-semibold text-foreground">SMS Smishing</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Messages Sent</span>
              <span className="font-semibold text-foreground">{simData?.smishing?.sent || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Delivery Rate</span>
              <span className="font-semibold text-blue-400">{simData?.smishing?.deliveryRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Click Rate</span>
              <span className="font-semibold text-yellow-400">{simData?.smishing?.clickRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Compromise Rate</span>
              <span className="font-semibold text-red-400">{simData?.smishing?.compromiseRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Report Rate</span>
              <span className="font-semibold text-green-400">{simData?.smishing?.reportRate || 0}%</span>
            </div>
          </div>
        </Card>

        {/* Voice Vishing */}
        <Card className="p-6 border-blue-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Phone className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-semibold text-foreground">Voice Vishing</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Calls Initiated</span>
              <span className="font-semibold text-foreground">{simData?.vishing?.initiated || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Answer Rate</span>
              <span className="font-semibold text-blue-400">{simData?.vishing?.answerRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Engagement Rate</span>
              <span className="font-semibold text-yellow-400">{simData?.vishing?.engagementRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Report Rate</span>
              <span className="font-semibold text-green-400">{simData?.vishing?.reportRate || 0}%</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulation Type Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold font-poppins text-foreground">Simulation Type Comparison</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={simulationTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="total" name="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicked" name="Clicked/Engaged" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reported" name="Reported" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Response Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold font-poppins text-foreground">Overall Response Distribution</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={responseDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {responseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Funnel Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold font-poppins text-foreground">SMS Campaign Funnel</h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={smishingFunnel} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {smishingFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Voice Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold font-poppins text-foreground">Voice Campaign Funnel</h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vishingFunnel} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {vishingFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Department Risk Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold font-poppins text-foreground">Department Risk Analysis</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentRisk} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                <YAxis dataKey="department" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="risk" name="Risk Score" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Department List */}
            <div className="space-y-3">
              {departmentRisk.map((dept: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      dept.risk >= 60 ? 'bg-red-500' : dept.risk >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <p className="font-medium text-foreground">{dept.department}</p>
                      <p className="text-xs text-muted-foreground">{dept.employees} employees</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      dept.risk >= 60 ? 'text-red-400' : dept.risk >= 40 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {dept.risk}%
                    </p>
                    <p className="text-xs text-muted-foreground">{dept.highRisk} high risk</p>
                  </div>
                </div>
              ))}
              {departmentRisk.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No department data available
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Key Metrics Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="p-6">
          <h2 className="text-lg font-bold font-poppins text-foreground mb-4">Key Performance Indicators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">{dashStats?.avgClickRate?.toFixed(1) || 0}%</p>
              <p className="text-sm text-muted-foreground mt-1">Avg Click Rate</p>
              <div className="flex items-center justify-center gap-1 mt-2 text-green-400 text-xs">
                <TrendingDown className="w-3 h-3" />
                <span>Lower is better</span>
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">{dashStats?.avgReportRate?.toFixed(1) || 0}%</p>
              <p className="text-sm text-muted-foreground mt-1">Avg Report Rate</p>
              <div className="flex items-center justify-center gap-1 mt-2 text-green-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>Higher is better</span>
              </div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">{dashStats?.activeCampaigns || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">Active Campaigns</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">{dashStats?.trainingProgress || 0}%</p>
              <p className="text-sm text-muted-foreground mt-1">Training Progress</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}


