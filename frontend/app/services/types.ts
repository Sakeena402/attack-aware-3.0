// /services/types.ts
// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'employee' | 'manager' | 'super_admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// ─── Employee ─────────────────────────────────────────────────────────────────
export type RiskLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'critical';
export type RiskTrend = 'improving' | 'stable' | 'declining';

export interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  position?: string;
  department?: string;
  role?: string;
  companyId?: string;
  // Gamification
  points?: number;
  badge?: string;
  trainingProgress?: number;
  // Risk scoring (5-tier engine)
  riskScore?: number;
  riskLevel?: RiskLevel;
  riskTrend?: RiskTrend;
  riskConfidence?: string;
  riskBreakdown?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── Campaign ─────────────────────────────────────────────────────────────────
export interface Campaign {
  _id: string;
  campaignName: string;
  type: 'phishing' | 'smishing' | 'vishing';
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  status: 'draft' | 'active' | 'completed' | 'paused';
  description?: string;
  startDate?: string;
  endDate?: string;
  targetEmployees?: { _id: string; phone: string }[];
  targetDepartments?: string[];
  emailTemplate?: string;
  smsTemplate?: string;
  voiceScript?: string;
  clickRate?: number;
  reportRate?: number;
  companyId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  _id?: string;
  userId: string;
  userName: string;
  email?: string;
  department?: string;
  score?: number;
  points?: number;
  badge?: string;
  rank?: number;
  trend?: 'up' | 'down' | 'stable';
  // Legacy field – keep for backward compat
  totalDonated?: number;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalEmployees: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalSimulations?: number;
  totalClicks?: number;
  totalReports?: number;
  totalCompromised?: number;
  phishProneRate?: number;
  avgClickRate: number;
  avgReportRate: number;
  avgCompromiseRate?: number;
  trainingProgress: number;
  overallRiskScore?: number;
  totalPoints?: number;
  riskDistribution?: {
    very_low: number;
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  responseTimeBuckets?: { excellent: number; good: number; average: number; poor: number };
  period?: string;
}

// AnalyticsOverview — alias to DashboardStats for useApi.ts compatibility
export type AnalyticsOverview = DashboardStats;

// ─── Activity Feed ────────────────────────────────────────────────────────────
export interface Activity {
  _id?: string;
  userId?: string;
  userName?: string;
  type?: string;
  action?: string;
  description?: string;
  points?: number;
  createdAt?: string;
  timestamp?: string;
}

// ─── Analytics data (legacy alias) ───────────────────────────────────────────
export interface AnalyticsData {
  totalDonations: number;
  totalUsers: number;
  campaignsCount: number;
}