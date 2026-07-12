'use client';

import { useAuth } from '@/app/context/authContext';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { apiService } from '@/app/services/api';
import { MetricCard } from '@/components/dashboard/metric-card';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton-loader';
import { useToast } from '@/components/ui/toast-notification';
import { Building2, Users, TrendingUp, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const fetcher = async (url: string) => {
  const response = await apiService.get(url);
  return response.data;
};

const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];

export default function SuperAdminDashboard() {
  const { state } = useAuth();
  const { error: showError } = useToast();

  if (state.user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Access Denied: Super Admin role required</p>
      </div>
    );
  }

  const { data: globalStats, isLoading } = useSWR<any>(
    '/super-admin/analytics/global',
    fetcher,
    { onError: () => showError('Failed to load analytics'), refreshInterval: 5000 }
  );

  const { data: companiesData, isLoading: companiesLoading } = useSWR<any>(
    '/super-admin/companies',
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 5000 }
  );

  const companies = companiesData?.companies || companiesData || [];
  const platformGrowth = globalStats?.platformGrowth || [];
  const industryData = globalStats?.industryData || [];

  // ✅ Industry-aligned risk color based on phish-prone %
  const getPhishRiskColor = (rate: number) =>
    rate >= 36 ? 'text-red-400' :
    rate >= 16 ? 'text-yellow-400' :
    'text-green-400';

  const getPhishRiskLabel = (rate: number) =>
    rate >= 36 ? 'High Risk' :
    rate >= 16 ? 'Medium Risk' :
    'Low Risk';

  return (
    <div className="space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-foreground">Platform Administration</h1>
        <p className="text-slate-400">Global platform overview and management</p>
      </motion.div>

      {/* Metric Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {isLoading ? (
          <>
            <StatCardSkeleton /><StatCardSkeleton />
            <StatCardSkeleton /><StatCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              label="Total Companies"
              value={globalStats?.totalCompanies || companies?.length || 0}
              icon={Building2}
              trend="companies"
              trendPositive={true}
              color="purple"
            />
            <MetricCard
              label="Total Employees"
              value={globalStats?.totalEmployees || 0}
              icon={Users}
              trend="across all"
              trendPositive={true}
              color="blue"
            />
            <MetricCard
              label="Active Campaigns"
              value={globalStats?.activeCampaigns || 0}
              icon={Activity}
              trend="running"
              trendPositive={true}
              color="green"
            />
            <MetricCard
              label="Platform Phish-Prone %"
              value={`${globalStats?.globalClickRate || 0}%`}
              icon={TrendingUp}
              trend={getPhishRiskLabel(globalStats?.globalClickRate || 0)}
              trendPositive={(globalStats?.globalClickRate || 0) < 16}
              color="cyan"
            />
          </>
        )}
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Platform Growth */}
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Platform Growth</h2>
              <p className="text-xs text-slate-400 mt-1">Companies registered per month</p>
            </div>
            <TrendingUp className="text-cyan-400" size={24} />
          </div>
          {isLoading ? (
            <ChartSkeleton />
          ) : platformGrowth.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
              No growth data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={platformGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid #8b5cf6',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="companies"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Companies Joined"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Companies by Industry */}
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Companies by Industry</h2>
              <p className="text-xs text-slate-400 mt-1">Distribution across sectors</p>
            </div>
          </div>
          {isLoading ? (
            <ChartSkeleton />
          ) : industryData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
              No industry data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={industryData}
                  cx="50%" cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (${value})`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {industryData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid #8b5cf6',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>

      {/* Quick Stats Row — industry-aligned */}
      {!isLoading && globalStats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            {
              label: 'Total Simulations',
              value: globalStats.totalSimulations || 0,
              color: 'text-purple-400',
              desc: 'All phishing/smishing/vishing',
            },
            {
              label: 'Total Compromised',
              value: globalStats.totalCompromised || 0,
              color: 'text-red-400',
              desc: 'Credentials submitted',
            },
            {
              label: 'Total Reported',
              value: globalStats.totalReported || 0,
              color: 'text-green-400',
              desc: 'Threats identified',
            },
            {
              // ✅ Industry term — phish-prone % with color based on threshold
              label: 'Platform Phish-Prone Rate',
              value: `${globalStats.globalClickRate || 0}%`,
              color: getPhishRiskColor(globalStats.globalClickRate || 0),
              desc: getPhishRiskLabel(globalStats.globalClickRate || 0),
            },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 surface-1 rounded-xl border border-purple-500/20">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.desc}</p>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Companies List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">All Companies</h2>
              <p className="text-xs text-slate-400 mt-1">{companies.length} companies registered</p>
            </div>
            <Building2 className="text-purple-400" size={24} />
          </div>

          {companiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : companies && companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company: any) => (
                <motion.div
                  key={company._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-purple-500/50 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {company.companyName || 'N/A'}
                      </h3>
                      <p className="text-xs text-slate-400">{company.industry || 'Unknown'}</p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-300 capitalize">
                      {company.plan || 'Basic'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-600/50">
                    <span className="text-xs text-slate-400">
                      Employees: {company.employeeCount || 0}
                    </span>
                    <span className="text-xs text-foreground">
                      {new Date(company.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No companies registered yet</p>
          )}
        </Card>
      </motion.div>

      {/* System Health */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20">
          <h2 className="text-xl font-bold text-foreground mb-6">System Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'API Status',      status: 'Operational', color: 'green' },
              { label: 'Database',        status: 'Healthy',     color: 'green' },
              { label: 'Cache',           status: 'Active',      color: 'green' },
              { label: 'Background Jobs', status: 'Running',     color: 'green' },
            ].map((item, index) => (
              <div key={index} className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">{item.label}</p>
                <p className={`text-sm font-semibold ${
                  item.color === 'green'  ? 'text-green-400'  :
                  item.color === 'yellow' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {item.status}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

    </div>
  );
}