'use client';

import { Card } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const clickRateData = [
  { campaign: 'Campaign 1', clicks: 45, reports: 25 },
  { campaign: 'Campaign 2', clicks: 38, reports: 32 },
  { campaign: 'Campaign 3', clicks: 28, reports: 42 },
  { campaign: 'Campaign 4', clicks: 35, reports: 38 },
];

const trendData = [
  { week: 'Week 1', rate: 45 },
  { week: 'Week 2', rate: 42 },
  { week: 'Week 3', rate: 38 },
  { week: 'Week 4', rate: 35 },
];

const resultData = [
  { name: 'Safe', value: 45, color: '#10b981' },
  { name: 'Clicked', value: 30, color: '#f59e0b' },
  { name: 'Compromised', value: 15, color: '#ef4444' },
  { name: 'Reported', value: 10, color: '#8b5cf6' },
];

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-poppins text-foreground mb-2">
          Analytics & Reports
        </h1>
        <p className="text-muted-foreground">Track your organization's cybersecurity awareness progress</p>
      </div>

      {/* Date Filter */}
      <div className="mb-6 flex gap-2">
        {['This Week', 'This Month', 'This Quarter', 'This Year'].map((period) => (
          <button
            key={period}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'This Month'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Click Rate by Campaign */}
        <Card className="p-6">
          <h2 className="text-lg font-bold font-poppins text-foreground mb-4">Click Rate by Campaign</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clickRateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="campaign" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip />
              <Legend />
              <Bar dataKey="clicks" fill="#ef4444" />
              <Bar dataKey="reports" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Click Rate Trend */}
        <Card className="p-6">
          <h2 className="text-lg font-bold font-poppins text-foreground mb-4">Click Rate Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="week" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Response Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-bold font-poppins text-foreground mb-4">Response Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={resultData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {resultData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Statistics */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">KEY METRICS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-foreground">34.5%</p>
                <p className="text-sm text-muted-foreground">Avg Click Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">45.8%</p>
                <p className="text-sm text-muted-foreground">Avg Report Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">156</p>
                <p className="text-sm text-muted-foreground">Trained Employees</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">12</p>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">TRENDING</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Click Rate</span>
                <span className="text-sm font-semibold text-green-500">↓ 5.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Report Rate</span>
                <span className="text-sm font-semibold text-green-500">↑ 3.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Training Completion</span>
                <span className="text-sm font-semibold text-green-500">↑ 12.5%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
