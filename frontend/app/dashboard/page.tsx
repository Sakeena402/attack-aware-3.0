'use client';

import { useAuth } from '@/app/context/authContext';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { api, analyticsApi, campaignApi, leaderboardApi, DashboardStats, Campaign, LeaderboardEntry } from '@/app/services/api';
import { MetricCard } from '@/components/dashboard/metric-card';
import { StatCardSkeleton, ChartSkeleton, ActivityItemSkeleton } from '@/components/ui/skeleton-loader';
import { useToast } from '@/components/ui/toast-notification';
import {
  Users,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Zap,
  Target,
  Activity,
  Trophy,
  CheckCircle,
  Clock,
  Play,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await api.get(url);
  return response.data;
};

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="glassmorphism p-3 rounded-lg border border-purple-500/20 shadow-xl">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const { state } = useAuth();
  const { error: showError } = useToast();

  // Fetch dashboard stats
  const { data: dashboardStats, error: statsError, isLoading: statsLoading } = useSWR<DashboardStats>(
    state.user?.companyId ? `/analytics/dashboard?companyId=${state.user.companyId}` : '/analytics/dashboard',
    fetcher,
    {
      onError: () => showError('Failed to load dashboard stats'),
      revalidateOnFocus: false,
    }
  );

  // Fetch recent campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useSWR<Campaign[]>(
    state.user?.companyId ? `/campaigns?companyId=${state.user.companyId}` : '/campaigns',
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = useSWR<LeaderboardEntry[]>(
    state.user?.companyId ? `/leaderboard?companyId=${state.user.companyId}&limit=5` : '/leaderboard?limit=5',
    fetcher,
    { revalidateOnFocus: false }
  );

  const isAdmin = state.user?.role === 'admin' || state.user?.role === 'super_admin';

  // Chart data - either from API or mock for display purposes
  const monthlyData = [
    { month: 'Jan', clickRate: 35, reportRate: 20 },
    { month: 'Feb', clickRate: 32, reportRate: 25 },
    { month: 'Mar', clickRate: 28, reportRate: 32 },
    { month: 'Apr', clickRate: 25, reportRate: 38 },
    { month: 'May', clickRate: 22, reportRate: 42 },
    { month: 'Jun', clickRate: 18, reportRate: 48 },
  ];

  const departmentData = [
    { name: 'Engineering', score: 92 },
    { name: 'Sales', score: 78 },
    { name: 'Marketing', score: 85 },
    { name: 'HR', score: 88 },
    { name: 'Finance', score: 95 },
  ];

  const COLORS = ['#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B'];

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400';
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'paused':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="w-3 h-3" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'draft':
        return <Clock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        className="flex flex-col gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold font-poppins text-foreground">
          Welcome back, {state.user?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Manage your organization's security awareness training"
            : 'Track your cybersecurity training progress'}
        </p>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : isAdmin ? (
          <>
            <MetricCard
              icon={Zap}
              label="Active Campaigns"
              value={dashboardStats?.activeCampaigns ?? 0}
              trend={`${dashboardStats?.totalCampaigns ?? 0} total`}
              trendPositive={true}
              color="purple"
              delay={0.1}
            />
            <MetricCard
              icon={Users}
              label="Total Employees"
              value={dashboardStats?.totalEmployees ?? 0}
              trend="Enrolled in training"
              trendPositive={true}
              color="blue"
              delay={0.2}
            />
            <MetricCard
              icon={AlertTriangle}
              label="Avg Click Rate"
              value={`${dashboardStats?.avgClickRate?.toFixed(1) ?? 0}%`}
              trend="Lower is better"
              trendPositive={(dashboardStats?.avgClickRate ?? 100) < 30}
              color="cyan"
              delay={0.3}
            />
            <MetricCard
              icon={TrendingUp}
              label="Avg Report Rate"
              value={`${dashboardStats?.avgReportRate?.toFixed(1) ?? 0}%`}
              trend="Higher is better"
              trendPositive={(dashboardStats?.avgReportRate ?? 0) > 40}
              color="green"
              delay={0.4}
            />
          </>
        ) : (
          <>
            <MetricCard
              icon={TrendingUp}
              label="Your Points"
              value={state.user?.points ?? dashboardStats?.totalPoints ?? 0}
              trend="Keep learning!"
              trendPositive={true}
              color="purple"
              delay={0.1}
            />
            <MetricCard
              icon={Target}
              label="Phishing Detection"
              value={`${100 - (dashboardStats?.avgClickRate ?? 15)}%`}
              trend="Detection accuracy"
              trendPositive={true}
              color="blue"
              delay={0.2}
            />
            <MetricCard
              icon={BarChart3}
              label="Training Progress"
              value={`${dashboardStats?.trainingProgress ?? 65}%`}
              trend="Complete all modules"
              trendPositive={true}
              color="cyan"
              delay={0.3}
            />
            <MetricCard
              icon={Trophy}
              label="Your Badge"
              value={state.user?.badge ?? 'Rookie'}
              trend="Keep improving!"
              trendPositive={true}
              color="green"
              delay={0.4}
            />
          </>
        )}
      </motion.div>

      {/* Charts Section */}
      {isAdmin && (
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Trend Chart */}
          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
            <h2 className="text-lg font-bold font-poppins text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Performance Trend
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="clickRateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="reportRateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="clickRate"
                    stroke="#EF4444"
                    fillOpacity={1}
                    fill="url(#clickRateGradient)"
                    name="Click Rate"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="reportRate"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#reportRateGradient)"
                    name="Report Rate"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">Click Rate (Lower is better)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Report Rate (Higher is better)</span>
              </div>
            </div>
          </Card>

          {/* Department Scores */}
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <h2 className="text-lg font-bold font-poppins text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Department Security Scores
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Score']}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {departmentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recent Activity and Leaderboard */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {/* Recent Campaigns */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
            <h2 className="text-lg font-bold font-poppins text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Recent Campaigns
            </h2>
            <div className="space-y-3">
              {campaignsLoading ? (
                Array.from({ length: 4 }).map((_, i) => <ActivityItemSkeleton key={i} />)
              ) : campaigns && campaigns.length > 0 ? (
                campaigns.slice(0, 5).map((campaign, idx) => (
                  <motion.div
                    key={campaign._id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + idx * 0.1 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        campaign.type === 'phishing' ? 'bg-red-500/20' :
                        campaign.type === 'smishing' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                      }`}>
                        <Zap className={`w-4 h-4 ${
                          campaign.type === 'phishing' ? 'text-red-400' :
                          campaign.type === 'smishing' ? 'text-yellow-400' : 'text-blue-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{campaign.campaignName}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {campaign.type} - {campaign.targetEmployees?.length || 0} targets
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-foreground">
                          {campaign.clickRate?.toFixed(1) || 0}% click
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.reportRate?.toFixed(1) || 0}% report
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(campaign.status)}`}>
                        {getStatusIcon(campaign.status)}
                        {campaign.status}
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No campaigns yet</p>
                  <p className="text-sm">Create your first campaign to get started</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Top Performers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20 h-full">
            <h2 className="text-lg font-bold font-poppins text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Top Performers
            </h2>
            <div className="space-y-3">
              {leaderboardLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : leaderboard && leaderboard.length > 0 ? (
                leaderboard.slice(0, 5).map((entry, idx) => (
                  <motion.div
                    key={entry._id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + idx * 0.1 }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      idx === 0 ? 'bg-yellow-500/30 text-yellow-400' :
                      idx === 1 ? 'bg-gray-400/30 text-gray-300' :
                      idx === 2 ? 'bg-orange-600/30 text-orange-400' :
                      'bg-muted/50 text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{entry.userName}</p>
                      <p className="text-xs text-muted-foreground">{entry.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-400">{entry.score}</p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No rankings yet</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
