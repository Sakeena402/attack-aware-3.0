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
//hifza code below 
export interface Employee {
  _id: string;      // id ki jagah _id
  name: string;
  email: string;
  phone?: string;   // ye add karo
  phoneNumber?: string;  // ye bhi add karo
  position: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}

//sakeena code below commented out
/*
export interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}
*/
//hifza code 
export interface Campaign {
  _id: string;      // id ki jagah _id
  campaignName: string;
  type: 'phishing' | 'smishing' | 'vishing';
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
  createdAt: string;
  updatedAt: string;
}

//sakeena code below commented out
/*
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
*/
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