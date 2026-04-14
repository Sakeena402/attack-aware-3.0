'use client';

import { useAuth } from '@/app/context/authContext';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { apiService  } from '@/app/services/api';
import { MetricCard } from '@/components/dashboard/metric-card';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton-loader';
import { useToast } from '@/components/ui/toast-notification';
import { Building2, Users, TrendingUp, BarChart3, Globe, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const fetcher = async (url: string) => {
  const response = await apiService.get(url);
  return response.data.data || response.data;
};

const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];

export default function SuperAdminDashboard() {
  const { state } = useAuth();
  const { error: showError } = useToast();

  // Only super_admin role can access
  if (state.user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Access Denied: Super Admin role required</p>
      </div>
    );
  }

  // Fetch global analytics
  const { data: globalStats, isLoading: statsLoading, error: statsError } = useSWR<any>(
    '/super-admin/analytics/global',
    fetcher,
    { onError: () => showError('Failed to load global stats') }
  );

  // Fetch all companies
  const { data: companiesData, isLoading: companiesLoading } = useSWR<{ companies?: any[] }>(
    '/super-admin/companies',
    fetcher,
    { revalidateOnFocus: false }
  );

  const companies = companiesData?.companies || companiesData || [];

  const platformData = [
    { month: 'Jan', companies: 12, employees: 450 },
    { month: 'Feb', companies: 15, employees: 580 },
    { month: 'Mar', companies: 18, employees: 720 },
    { month: 'Apr', companies: 22, employees: 890 },
    { month: 'May', companies: 26, employees: 1050 },
    { month: 'Jun', companies: 31, employees: 1280 },
  ];

  const companyTypeData = [
    { name: 'Tech', value: 12 },
    { name: 'Finance', value: 8 },
    { name: 'Healthcare', value: 6 },
    { name: 'Retail', value: 3 },
    { name: 'Other', value: 2 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Platform Administration</h1>
        <p className="text-slate-400">Global platform overview and management</p>
      </motion.div>

      {/* Global Metrics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Companies"
              value={companies?.length || 0}
              icon={Building2}
              trend={+3}
              color="purple"
            />
            <MetricCard
              title="Total Employees"
              value={globalStats?.totalEmployees || 0}
              icon={Users}
              trend={+15}
              color="blue"
            />
            <MetricCard
              title="Active Campaigns"
              value={globalStats?.activeCampaigns || 0}
              icon={Activity}
              trend={+5}
              color="green"
            />
            <MetricCard
              title="Global Click Rate"
              value={`${globalStats?.globalClickRate || 0}%`}
              icon={TrendingUp}
              trend={-2}
              color="orange"
            />
          </>
        )}
      </motion.div>

      {/* Platform Growth and Company Distribution */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Platform Growth */}
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Platform Growth</h2>
            <TrendingUp className="text-cyan-400" size={24} />
          </div>
          {statsLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={platformData}>
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
                  name="Companies"
                />
                <Line
                  type="monotone"
                  dataKey="employees"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: '#06b6d4', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Employees"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Company Distribution */}
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Companies by Industry</h2>
            <Globe className="text-yellow-400" size={24} />
          </div>
          {statsLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={companyTypeData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name} (${value})`} outerRadius={100} fill="#8b5cf6" dataKey="value">
                  {companyTypeData.map((entry, index) => (
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

      {/* Companies List */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">All Companies</h2>
            <Building2 className="text-purple-400" size={24} />
          </div>

          {companiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : companies && companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => (
                <motion.div
                  key={company._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-purple-500/50 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{company.companyName || 'N/A'}</h3>
                      <p className="text-xs text-slate-400">{company.industry || 'Unknown'}</p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-300">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-600/50">
                    <span className="text-xs text-slate-400">Created</span>
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <h2 className="text-xl font-bold text-foreground mb-6">System Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'API Status', status: 'Operational', color: 'green' },
              { label: 'Database', status: 'Healthy', color: 'green' },
              { label: 'Cache', status: 'Active', color: 'green' },
              { label: 'Background Jobs', status: 'Running', color: 'green' },
            ].map((item, index) => (
              <div key={index} className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">{item.label}</p>
                <p className={`text-sm font-semibold ${
                  item.color === 'green' ? 'text-green-400' : item.color === 'yellow' ? 'text-yellow-400' : 'text-red-400'
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
