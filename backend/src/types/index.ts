import { Document, Types } from 'mongoose';
import { Request, Response, NextFunction } from 'express';


export type UserRole = 'super_admin' | 'admin' | 'employee';
export type CampaignType = 'phishing' | 'smishing' | 'vishing';
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'paused';

// User Document
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  companyId: Types.ObjectId;
  department: string;
  points: number;
  badges: string[];
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Company Document
export interface ICompany extends Document {
  _id: Types.ObjectId;
  companyName: string;
  industry: string;
  adminId: Types.ObjectId;
  employeeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

//hifza code
export interface ICampaign extends Document {
  _id: Types.ObjectId;
  campaignName: string;
  type: CampaignType;
  createdBy: Types.ObjectId;
  companyId: Types.ObjectId;
  description: string;
  status: CampaignStatus;
  startDate: Date;
  endDate?: Date;
  targetCount: number;
  completedCount: number;

  // Arrays
  targetEmployees: Array<{ _id: Types.ObjectId; phone: string }>;
  targetDepartments: string[];

  // Templates
  emailTemplate?: string;
  smsTemplate?: string;
  customSmsMessage?: string;
  voiceScript?: string;

  // Scheduling
  scheduledTime?: Date;

  // Stats
  sentCount: number;
  deliveredCount: number;
  clickedCount: number;
  reportedCount: number;
  clickRate: number;
  reportRate: number;

  createdAt: Date;
  updatedAt: Date;
}

/* sakeena code is commented below
// Campaign Document
export interface ICampaign extends Document {
  _id: Types.ObjectId;
  campaignName: string;
  type: CampaignType;
  createdBy: Types.ObjectId;
  companyId: Types.ObjectId;
  description: string;
  status: CampaignStatus;
  startDate: Date;
  endDate: Date;
  targetCount: number;
  completedCount: number;
  createdAt: Date;
  updatedAt: Date;
}*/


//hifza code 
export interface ISimulationResult extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  campaignId: Types.ObjectId;

  simulationType: 'phishing' | 'smishing' | 'vishing';

  // Smishing fields
  smsSent?: boolean;
  smsSentAt?: Date;
  smsTemplate?: string;
  messageSid?: string;
  phoneNumber?: string;

  // Phishing fields
  emailOpened?: boolean;
  linkClicked?: boolean;
  credentialsSubmitted?: boolean;
  reportedPhishing?: boolean;

  trackingToken?: string;

  createdAt: Date;
  updatedAt: Date;
}


//sakeena code is commented below
/*
// SimulationResult Document
export interface ISimulationResult extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  campaignId: Types.ObjectId;
  emailOpened: boolean;
  linkClicked: boolean;
  credentialsSubmitted: boolean;
  reportedPhishing: boolean;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}
*/

// Leaderboard Document
export interface ILeaderboard extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  department: string;
  score: number;
  rank: number;
  createdAt: Date;
  updatedAt: Date;
}

// ContactMessage Document
export interface IContactMessage extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}
//hifza code 
export interface AuthRequest extends Request {
  userId?: string;
  user?: { 
    id: string; 
    role: UserRole;
    companyId: string;
    email: string; // ✅ add karo
  };
}

/* sakeena code is commented below
// Auth Request
export interface AuthRequest extends Request {
  userId?: string;
  user?: { id: string; role: UserRole };
}
*/
// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Login Request
export interface LoginRequest {
  email: string;
  password: string;
}

// Register Request
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  companyName?: string;
  department?: string;
  role?: UserRole;
}

// JWT Payload
export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  companyId?: string;
  iat?: number;
  exp?: number;
}

// Campaign Statistics
export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalParticipants: number;
  overallClickRate: number;
}

// Employee Stats
export interface EmployeeStats {
  totalEmployees: number;
  activeUsers: number;
  avgClickRate: number;
  avgReportRate: number;
}

// Analytics Data
export interface AnalyticsData {
  totalCampaigns: number;
  totalParticipants: number;
  averageClickRate: number;
  averageReportRate: number;
  campaignsByType: Record<CampaignType, number>;
  topDepartments: Array<{ department: string; score: number }>;
  trainingProgress: number;
}
