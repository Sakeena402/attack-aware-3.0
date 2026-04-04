// 'use client';

// import { useAuth } from '@/app/context/authContext';
// import { motion } from 'framer-motion';
// import useSWR from 'swr';
// //import { api, analyticsApi, campaignApi, leaderboardApi, DashboardStats, Campaign, LeaderboardEntry } from '@/app/services/api';
// import { MetricCard } from '@/components/dashboard/metric-card';
// import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton-loader';
// import { useToast } from '@/components/ui/toast-notification';
// import {
//   Users,
//   BarChart3,
//   AlertTriangle,
//   TrendingUp,
//   Zap,
//   Target,
//   Activity,
//   Trophy,
// } from 'lucide-react';
// import { Card } from '@/components/ui/card';
// import {
//   AreaChart,
//   Area,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   Cell,
// } from 'recharts';
// import { apiService} from '@/app/services/api';
// import type { DashboardStats, Campaign, LeaderboardEntry } from '@/app/services/types';
// const fetcher = async (url: string) => {
//   const response = await apiService.get(url);
//   return response.data.data || response.data;
// };

// const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];

// export default function AdminDashboard() {
//   const { state } = useAuth();
//   const { error: showError } = useToast();

//   // Only ADMIN role can access
//   if (state.user?.role !== 'admin') {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <p className="text-red-500">Access Denied: Admin role required</p>
//       </div>
//     );
//   }

//   // Fetch dashboard stats for this company
//   const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useSWR<DashboardStats>(
//     '/analytics/dashboard',
//     fetcher,
//     { onError: () => showError('Failed to load dashboard stats') }
//   );

//   // Fetch campaigns for this company
//   const { data: campaigns, isLoading: campaignsLoading } = useSWR<Campaign[]>(
//     '/campaigns',
//     fetcher,
//     { revalidateOnFocus: false }
//   );

//   // Fetch company leaderboard
//   const { data: leaderboard, isLoading: leaderboardLoading } = useSWR<LeaderboardEntry[]>(
//     '/leaderboard?limit=10',
//     fetcher,
//     { revalidateOnFocus: false }
//   );

//   const monthlyData = [
//     { month: 'Jan', clickRate: 35, reportRate: 20 },
//     { month: 'Feb', clickRate: 32, reportRate: 25 },
//     { month: 'Mar', clickRate: 28, reportRate: 32 },
//     { month: 'Apr', clickRate: 25, reportRate: 38 },
//     { month: 'May', clickRate: 22, reportRate: 42 },
//     { month: 'Jun', clickRate: 18, reportRate: 48 },
//   ];

//   const departmentData = [
//     { name: 'IT', vulnerability: 45, employees: 12 },
//     { name: 'HR', vulnerability: 38, employees: 8 },
//     { name: 'Finance', vulnerability: 52, employees: 15 },
//     { name: 'Sales', vulnerability: 35, employees: 20 },
//   ];

//   return (
//     <div className="space-y-8">
//       {/* Header */}
//       <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
//         <h1 className="text-3xl font-bold text-foreground">Company Dashboard</h1>
//         <p className="text-slate-400">Manage your company's security awareness</p>
//       </motion.div>

//       {/* Key Metrics */}
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ staggerChildren: 0.1 }}
//         className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
//       >
//         {statsLoading ? (
//           <>
//             <StatCardSkeleton />
//             <StatCardSkeleton />
//             <StatCardSkeleton />
//             <StatCardSkeleton />
//           </>
//         ) : (
//           <>
//             <MetricCard
//               title="Total Employees"
//               value={dashboardStats?.totalEmployees || 0}
//               icon={Users}
//               trend={+5}
//               color="purple"
//             />
//             <MetricCard
//               title="Active Campaigns"
//               value={dashboardStats?.activeCampaigns || 0}
//               icon={Zap}
//               trend={+2}
//               color="blue"
//             />
//             <MetricCard
//               title="Click Rate"
//               value={`${dashboardStats?.avgClickRate || 0}%`}
//               icon={Target}
//               trend={-3}
//               color="orange"
//             />
//             <MetricCard
//               title="Report Rate"
//               value={`${dashboardStats?.avgReportRate || 0}%`}
//               icon={AlertTriangle}
//               trend={+8}
//               color="green"
//             />
//           </>
//         )}
//       </motion.div>

//       {/* Charts */}
//       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Click vs Report Trend */}
//         <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
//           <div className="flex items-center justify-between mb-6">
//             <h2 className="text-xl font-bold text-foreground">Click vs Report Trend</h2>
//             <TrendingUp className="text-purple-400" size={24} />
//           </div>
//           {statsLoading ? (
//             <ChartSkeleton />
//           ) : (
//             <ResponsiveContainer width="100%" height={300}>
//               <AreaChart data={monthlyData}>
//                 <defs>
//                   <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
//                     <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
//                   </linearGradient>
//                   <linearGradient id="colorReport" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
//                     <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
//                   </linearGradient>
//                 </defs>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
//                 <XAxis dataKey="month" stroke="#64748b" />
//                 <YAxis stroke="#64748b" />
//                 <Tooltip
//                   contentStyle={{
//                     background: '#1e293b',
//                     border: '1px solid #8b5cf6',
//                     borderRadius: '8px',
//                   }}
//                 />
//                 <Area type="monotone" dataKey="clickRate" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorClick)" />
//                 <Area type="monotone" dataKey="reportRate" stroke="#10b981" fillOpacity={1} fill="url(#colorReport)" />
//               </AreaChart>
//             </ResponsiveContainer>
//           )}
//         </Card>

//         {/* Department Vulnerability */}
//         <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
//           <div className="flex items-center justify-between mb-6">
//             <h2 className="text-xl font-bold text-foreground">Department Vulnerability</h2>
//             <BarChart3 className="text-cyan-400" size={24} />
//           </div>
//           {statsLoading ? (
//             <ChartSkeleton />
//           ) : (
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={departmentData}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
//                 <XAxis dataKey="name" stroke="#64748b" />
//                 <YAxis stroke="#64748b" />
//                 <Tooltip
//                   contentStyle={{
//                     background: '#1e293b',
//                     border: '1px solid #8b5cf6',
//                     borderRadius: '8px',
//                   }}
//                 />
//                 <Bar dataKey="vulnerability" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
//                   {departmentData.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                   ))}
//                 </Bar>
//               </BarChart>
//             </ResponsiveContainer>
//           )}
//         </Card>
//       </motion.div>

//       {/* Campaigns and Leaderboard */}
//       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Recent Campaigns */}
//         <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
//           <div className="flex items-center justify-between mb-6">
//             <h2 className="text-xl font-bold text-foreground">Recent Campaigns</h2>
//             <Activity className="text-purple-400" size={24} />
//           </div>
//           {campaignsLoading ? (
//             <div className="space-y-3">
//               {[1, 2, 3].map((i) => (
//                 <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />
//               ))}
//             </div>
//           ) : campaigns && campaigns.length > 0 ? (
//             <div className="space-y-3">
//               {campaigns.slice(0, 5).map((campaign) => (
//                 <div key={campaign.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
//                   <div>
//                     <p className="text-sm font-medium text-foreground">{campaign.name}</p>
//                     <p className="text-xs text-slate-400 capitalize">{campaign.type}</p>
//                   </div>
//                   <span className={`px-2 py-1 rounded text-xs font-medium ${
//                     campaign.status === 'active'
//                       ? 'bg-green-500/20 text-green-400'
//                       : campaign.status === 'paused'
//                         ? 'bg-yellow-500/20 text-yellow-400'
//                         : 'bg-slate-500/20 text-slate-400'
//                   }`}>
//                     {campaign.status}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <p className="text-slate-400 text-sm">No campaigns yet</p>
//           )}
//         </Card>

//         {/* Top Performers */}
//         <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
//           <div className="flex items-center justify-between mb-6">
//             <h2 className="text-xl font-bold text-foreground">Top Performers</h2>
//             <Trophy className="text-yellow-400" size={24} />
//           </div>
//           {leaderboardLoading ? (
//             <div className="space-y-3">
//               {[1, 2, 3].map((i) => (
//                 <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />
//               ))}
//             </div>
//           ) : leaderboard && leaderboard.length > 0 ? (
//             <div className="space-y-2">
//               {leaderboard.slice(0, 5).map((entry, index) => (
//                 <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
//                   <div className="flex items-center gap-3">
//                     <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
//                       {index + 1}
//                     </span>
//                     <div>
//                       <p className="text-sm font-medium text-foreground">{entry.userId}</p>
//                       <p className="text-xs text-slate-400">{entry.department || 'N/A'}</p>
//                     </div>
//                   </div>
//                   <span className="text-sm font-bold text-purple-400">{entry.score} pts</span>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <p className="text-slate-400 text-sm">No leaderboard data yet</p>
//           )}
//         </Card>
//       </motion.div>
//     </div>
//   );
// }

                    


// frontend/app/dashboard/admin/page.tsx
'use client';

import { useAuth } from '@/app/context/authContext';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { MetricCard } from '@/components/dashboard/metric-card';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton-loader';
import { useToast } from '@/components/ui/toast-notification';
import { Users, BarChart3, AlertTriangle, TrendingUp, Zap, Target, Activity, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { apiService } from '@/app/services/api';
import type { DashboardStats, Campaign, LeaderboardEntry } from '@/app/services/types';

// apiService.get<T>() returns ApiResponse<T> and the `.data` field is already T.
// No need to unwrap a second time.
const fetcher = async <T>(url: string): Promise<T> => {
  const res = await apiService.get<T>(url);
  return res.data;
};

const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];

const monthlyData = [
  { month: 'Jan', clickRate: 35, reportRate: 20 },
  { month: 'Feb', clickRate: 32, reportRate: 25 },
  { month: 'Mar', clickRate: 28, reportRate: 32 },
  { month: 'Apr', clickRate: 25, reportRate: 38 },
  { month: 'May', clickRate: 22, reportRate: 42 },
  { month: 'Jun', clickRate: 18, reportRate: 48 },
];

const departmentData = [
  { name: 'IT',      vulnerability: 45, employees: 12 },
  { name: 'HR',      vulnerability: 38, employees: 8 },
  { name: 'Finance', vulnerability: 52, employees: 15 },
  { name: 'Sales',   vulnerability: 35, employees: 20 },
];

export default function AdminDashboard() {
  const { state }              = useAuth();
  const { error: showError }   = useToast();

  if (state.user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Access Denied: Admin role required</p>
      </div>
    );
  }

  const { data: dashboardStats, isLoading: statsLoading } = useSWR<DashboardStats>(
    '/analytics/dashboard',
    url => fetcher<DashboardStats>(url),
    { onError: () => showError('Failed to load dashboard stats') }
  );

  // Backend returns { campaigns: Campaign[], pagination: {...} } — pick the array
  const { data: campaignsResponse, isLoading: campaignsLoading } = useSWR<{ campaigns: Campaign[] }>(
    '/campaigns',
    url => fetcher<{ campaigns: Campaign[] }>(url),
    { revalidateOnFocus: false }
  );
  const campaigns = campaignsResponse?.campaigns ?? [];

  // Backend returns { entries: LeaderboardEntry[], pagination: {...} } — adjust to match your actual shape
  const { data: leaderboardResponse, isLoading: leaderboardLoading } = useSWR<{ entries: LeaderboardEntry[] }>(
    '/leaderboard?limit=10',
    url => fetcher<{ entries: LeaderboardEntry[] }>(url),
    { revalidateOnFocus: false }
  );
  const leaderboard = leaderboardResponse?.entries ?? [];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Company Dashboard</h1>
        <p className="text-slate-400">Manage your company's security awareness</p>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statsLoading ? (
          <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
        ) : (
          <>
            <MetricCard title="Total Employees" value={dashboardStats?.totalEmployees ?? 0}   icon={Users}         trend={+5} color="purple" />
            <MetricCard title="Active Campaigns" value={dashboardStats?.activeCampaigns ?? 0}  icon={Zap}           trend={+2} color="blue" />
            <MetricCard title="Click Rate"        value={`${dashboardStats?.avgClickRate ?? 0}%`}  icon={Target}    trend={-3} color="orange" />
            <MetricCard title="Report Rate"       value={`${dashboardStats?.avgReportRate ?? 0}%`} icon={AlertTriangle} trend={+8} color="green" />
          </>
        )}
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Click vs Report Trend</h2>
            <TrendingUp className="text-purple-400" size={24} />
          </div>
          {statsLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorReport" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="clickRate"  stroke="#8b5cf6" fillOpacity={1} fill="url(#colorClick)" />
                <Area type="monotone" dataKey="reportRate" stroke="#10b981" fillOpacity={1} fill="url(#colorReport)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Department Vulnerability</h2>
            <BarChart3 className="text-cyan-400" size={24} />
          </div>
          {statsLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '8px' }} />
                <Bar dataKey="vulnerability" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                  {departmentData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>

      {/* Campaigns + Leaderboard */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Recent Campaigns</h2>
            <Activity className="text-purple-400" size={24} />
          </div>
          {campaignsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />)}</div>
          ) : campaigns.length > 0 ? (
            <div className="space-y-3">
              {campaigns.slice(0, 5).map(campaign => (
                <div key={campaign.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
                  <div>
                    <p className="text-sm font-medium text-foreground">{campaign.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{campaign.type}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    campaign.status === 'active'  ? 'bg-green-500/20 text-green-400' :
                    campaign.status === 'paused'  ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No campaigns yet</p>
          )}
        </Card>

        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Top Performers</h2>
            <Trophy className="text-yellow-400" size={24} />
          </div>
          {leaderboardLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />)}</div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, index) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{entry.userId}</p>
                      <p className="text-xs text-slate-400">{entry.department ?? 'N/A'}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-purple-400">{entry.score} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No leaderboard data yet</p>
          )}
        </Card>
      </motion.div>
    </div>
  );
}