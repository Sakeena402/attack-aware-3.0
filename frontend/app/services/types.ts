// /services/api/types.ts

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  goal: number;
  raised: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsData {
  totalDonations: number;
  totalUsers: number;
  campaignsCount: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalDonated: number;
  rank: number;
}

// Type definitions for API responses
export interface DashboardStats {
  totalEmployees: number;
  totalCampaigns: number;
  activeCampaigns: number;
  avgClickRate: number;
  avgReportRate: number;
  totalPoints: number;
  trainingProgress: number;
}