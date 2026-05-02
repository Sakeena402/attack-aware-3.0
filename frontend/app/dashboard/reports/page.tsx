// frontend/app/dashboard/reports/page.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/app/context/authContext';
import { campaignReportsApi, AggregateReportData } from '@/app/services/campaignReportsApi';
import { Download, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ReportsPage() {
  const { state } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  const { data, isLoading, mutate } = useSWR<AggregateReportData>(
    state.user?.companyId ? `aggregate-report:${state.user.companyId}:${startDate}:${endDate}:${selectedDepts.join(',')}` : null,
    () => campaignReportsApi.getAggregateReport({
      companyId:   state.user?.companyId,
      startDate:   startDate || undefined,
      endDate:     endDate   || undefined,
      departments: selectedDepts.length > 0 ? selectedDepts : undefined,
    }),
    { revalidateOnFocus: false }
  );

  const handleDownloadPDF = async () => {
    await campaignReportsApi.downloadAggregatePDF({
      companyId:   state.user?.companyId,
      startDate:   startDate || undefined,
      endDate:     endDate   || undefined,
      departments: selectedDepts.length > 0 ? selectedDepts : undefined,
    });
  };

  const setPreset = (preset: 'week' | 'month' | 'quarter' | 'year') => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = new Date();

    if (preset === 'week')    start.setDate(now.getDate() - 7);
    if (preset === 'month')   start.setMonth(now.getMonth() - 1);
    if (preset === 'quarter') start.setMonth(now.getMonth() - 3);
    if (preset === 'year')    start.setFullYear(now.getFullYear() - 1);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Aggregate Reports</h1>
          <p className="text-muted-foreground mt-1">Generate and download detailed security awareness reports</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={!data}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </motion.div>

      {/* Date Range Selector */}
      <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20 hover:border-purple-500/30">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" /> Select Report Period
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Presets */}
          {[
            { key: 'week',    label: 'Last Week' },
            { key: 'month',   label: 'Last Month' },
            { key: 'quarter', label: 'Last Quarter' },
            { key: 'year',    label: 'Last Year' },
          ].map(p => (
            <button key={p.key}
              onClick={() => setPreset(p.key as any)}
              className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition text-sm font-medium"
            >
              {p.label}
            </button>
          ))}

          {/* Custom Range */}
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-foreground text-sm"
          />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-foreground text-sm"
          />
        </div>

        <button
          onClick={() => mutate()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-medium"
        >
          Generate Report
        </button>
      </Card>

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Campaigns',   value: data.period.totalCampaigns },
              { label: 'Total Simulations', value: data.overall.totalSimulations },
              { label: 'Avg Click Rate',    value: `${data.overall.clickRate}%` },
              { label: 'Avg Report Rate',   value: `${data.overall.reportRate}%` },
            ].map(({ label, value }) => (
              <Card key={label} className="p-4 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20 hover:border-purple-500/30">
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </Card>
            ))}
          </div>

          {/* Department Chart */}
          <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20 hover:border-purple-500/30">
            <h2 className="text-lg font-bold text-foreground mb-4">Department Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departmentBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="department" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="clickRate"       name="Click %"       fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="reportRate"      name="Report %"      fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="compromiseRate"  name="Compromise %"  fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Campaign List */}
          <Card className="p-6 surface-1 hover:surface-2 transition-all duration-300 rounded-xl border border-purple-500/20 hover:border-purple-500/30">
            <h2 className="text-lg font-bold text-foreground mb-4">Campaigns in Report ({data.campaigns.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    {['Campaign Name', 'Type', 'Start Date', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.map((c, i) => (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                      <td className="px-4 py-2 text-sm text-foreground">{c.name}</td>
                      <td className="px-4 py-2 text-sm text-slate-300 capitalize">{c.type}</td>
                      <td className="px-4 py-2 text-sm text-slate-400">{new Date(c.startDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          c.status === 'active'    ? 'bg-green-500/20 text-green-400' :
                          c.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                                      'bg-slate-500/20 text-slate-400'
                        }`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}