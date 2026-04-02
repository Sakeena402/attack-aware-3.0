import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import SimulationResult from '../models/SimulationResult.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, AnalyticsData } from '../types/index.js';

export const getCompanyAnalytics = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyId } = req.query as { companyId: string };

    if (!companyId) {
      throw new AppError('Company ID is required', 400);
    }

    const campaigns = await Campaign.find({ companyId });
    const totalCampaigns = campaigns.length;

    const results = await SimulationResult.find({
      campaignId: { $in: campaigns.map((c) => c._id) },
    });

    const totalParticipants = new Set(results.map((r) => r.userId.toString())).size;
    const clickCount = results.filter((r) => r.linkClicked).length;
    const reportCount = results.filter((r) => r.reportedPhishing).length;

    const averageClickRate = results.length > 0 ? (clickCount / results.length) * 100 : 0;
    const averageReportRate = results.length > 0 ? (reportCount / results.length) * 100 : 0;

    const campaignsByType = {
      phishing: campaigns.filter((c) => c.type === 'phishing').length,
      smishing: campaigns.filter((c) => c.type === 'smishing').length,
      vishing: campaigns.filter((c) => c.type === 'vishing').length,
    };

    const departments: { [key: string]: { total: number; points: number } } = {};
    const employees = await User.find({ companyId });

    employees.forEach((emp) => {
      if (!departments[emp.department]) {
        departments[emp.department] = { total: 0, points: 0 };
      }
      departments[emp.department].total++;
      departments[emp.department].points += emp.points;
    });

    const topDepartments = Object.entries(departments)
      .map(([dept, data]) => ({
        department: dept,
        score: data.total > 0 ? Math.round(data.points / data.total) : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const analytics: AnalyticsData = {
      totalCampaigns,
      totalParticipants,
      averageClickRate: Math.round(averageClickRate * 100) / 100,
      averageReportRate: Math.round(averageReportRate * 100) / 100,
      campaignsByType: campaignsByType as any,
      topDepartments,
      trainingProgress: Math.round((reportCount / Math.max(totalParticipants, 1)) * 100),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  }
};

export const getDashboardStats = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyId } = req.query as { companyId?: string };
    const userCompanyId = companyId || req.user.companyId;

    // Get employee count
    const totalEmployees = userCompanyId 
      ? await User.countDocuments({ companyId: userCompanyId })
      : await User.countDocuments();

    // Get campaign counts
    const campaignQuery = userCompanyId ? { companyId: userCompanyId } : {};
    const totalCampaigns = await Campaign.countDocuments(campaignQuery);
    const activeCampaigns = await Campaign.countDocuments({ ...campaignQuery, status: 'active' });

    // Get simulation results
    let results;
    if (userCompanyId) {
      const campaigns = await Campaign.find({ companyId: userCompanyId });
      results = await SimulationResult.find({
        campaignId: { $in: campaigns.map((c) => c._id) },
      });
    } else {
      results = await SimulationResult.find();
    }

    const clickCount = results.filter((r) => r.linkClicked).length;
    const reportCount = results.filter((r) => r.reportedPhishing).length;
    const avgClickRate = results.length > 0 ? (clickCount / results.length) * 100 : 0;
    const avgReportRate = results.length > 0 ? (reportCount / results.length) * 100 : 0;

    // Get user points for employees
    const employees = userCompanyId 
      ? await User.find({ companyId: userCompanyId })
      : await User.find();
    const totalPoints = employees.reduce((sum, emp) => sum + (emp.points || 0), 0);

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalCampaigns,
        activeCampaigns,
        avgClickRate: Math.round(avgClickRate * 100) / 100,
        avgReportRate: Math.round(avgReportRate * 100) / 100,
        totalPoints,
        trainingProgress: Math.min(100, Math.round((reportCount / Math.max(totalEmployees, 1)) * 100)),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  }
};

export const getGlobalAnalytics = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const totalCampaigns = await Campaign.countDocuments();
    const totalUsers = await User.countDocuments();
    const allResults = await SimulationResult.find();

    const clickCount = allResults.filter((r) => r.linkClicked).length;
    const reportCount = allResults.filter((r) => r.reportedPhishing).length;

    const averageClickRate =
      allResults.length > 0 ? (clickCount / allResults.length) * 100 : 0;
    const averageReportRate =
      allResults.length > 0 ? (reportCount / allResults.length) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalCampaigns,
        totalUsers,
        totalSimulations: allResults.length,
        averageClickRate: Math.round(averageClickRate * 100) / 100,
        averageReportRate: Math.round(averageReportRate * 100) / 100,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch global analytics' });
    }
  }
};

// Get simulation type breakdown analytics
export const getSimulationAnalytics = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyId } = req.query as { companyId?: string };
    const userCompanyId = companyId || req.user.companyId;

    // Get campaigns for this company
    const campaignQuery = userCompanyId ? { companyId: userCompanyId } : {};
    const campaigns = await Campaign.find(campaignQuery);
    const campaignIds = campaigns.map(c => c._id);

    // Get all results
    const results = await SimulationResult.find({
      campaignId: { $in: campaignIds },
    });

    // Phishing stats
    const phishingResults = results.filter(r => r.simulationType === 'phishing');
    const phishingClicks = phishingResults.filter(r => r.linkClicked).length;
    const phishingReports = phishingResults.filter(r => r.reportedPhishing).length;

    // Smishing stats
    const smishingResults = results.filter(r => r.simulationType === 'smishing');
    const smsSent = smishingResults.filter(r => r.smsSent).length;
    const smsDelivered = smishingResults.filter(r => r.smsDelivered).length;
    const smsClicked = smishingResults.filter(r => r.smsLinkClicked).length;
    const smsCompromised = smishingResults.filter(r => r.credentialsSubmitted && r.simulationType === 'smishing').length;
    const smsReported = smishingResults.filter(r => r.reportedPhishing).length;

    // Vishing stats
    const vishingResults = results.filter(r => r.simulationType === 'vishing');
    const callsInitiated = vishingResults.filter(r => r.callInitiated).length;
    const callsAnswered = vishingResults.filter(r => r.callAnswered).length;
    const callsEngaged = vishingResults.filter(r => r.voiceEngaged || r.voiceVerified).length;
    const callsReported = vishingResults.filter(r => r.voiceReported).length;

    res.json({
      success: true,
      data: {
        phishing: {
          total: phishingResults.length,
          clicked: phishingClicks,
          reported: phishingReports,
          clickRate: phishingResults.length > 0 
            ? Math.round((phishingClicks / phishingResults.length) * 100) 
            : 0,
          reportRate: phishingResults.length > 0 
            ? Math.round((phishingReports / phishingResults.length) * 100) 
            : 0,
        },
        smishing: {
          sent: smsSent,
          delivered: smsDelivered,
          clicked: smsClicked,
          compromised: smsCompromised,
          reported: smsReported,
          deliveryRate: smsSent > 0 ? Math.round((smsDelivered / smsSent) * 100) : 0,
          clickRate: smsDelivered > 0 ? Math.round((smsClicked / smsDelivered) * 100) : 0,
          compromiseRate: smsClicked > 0 ? Math.round((smsCompromised / smsClicked) * 100) : 0,
          reportRate: smsDelivered > 0 ? Math.round((smsReported / smsDelivered) * 100) : 0,
        },
        vishing: {
          initiated: callsInitiated,
          answered: callsAnswered,
          engaged: callsEngaged,
          reported: callsReported,
          answerRate: callsInitiated > 0 ? Math.round((callsAnswered / callsInitiated) * 100) : 0,
          engagementRate: callsAnswered > 0 ? Math.round((callsEngaged / callsAnswered) * 100) : 0,
          reportRate: callsAnswered > 0 ? Math.round((callsReported / callsAnswered) * 100) : 0,
        },
        summary: {
          totalSimulations: results.length,
          totalCompromised: phishingClicks + smsCompromised + callsEngaged,
          totalReported: phishingReports + smsReported + callsReported,
          overallRiskScore: results.length > 0
            ? Math.round(((phishingClicks + smsCompromised + callsEngaged) / results.length) * 100)
            : 0,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch simulation analytics' });
    }
  }
};

// Get department risk analysis
export const getDepartmentRiskAnalysis = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyId } = req.query as { companyId?: string };
    const userCompanyId = companyId || req.user.companyId;

    // Get users grouped by department
    const users = await User.find(userCompanyId ? { companyId: userCompanyId } : {});
    
    const departmentMap: Record<string, {
      employees: number;
      totalRiskScore: number;
      highRisk: number;
      mediumRisk: number;
      lowRisk: number;
    }> = {};

    users.forEach(user => {
      const dept = user.department || 'General';
      if (!departmentMap[dept]) {
        departmentMap[dept] = {
          employees: 0,
          totalRiskScore: 0,
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0,
        };
      }
      departmentMap[dept].employees++;
      departmentMap[dept].totalRiskScore += user.riskScore || 0;
      
      if (user.riskLevel === 'high') departmentMap[dept].highRisk++;
      else if (user.riskLevel === 'medium') departmentMap[dept].mediumRisk++;
      else departmentMap[dept].lowRisk++;
    });

    const departments = Object.entries(departmentMap).map(([name, data]) => ({
      department: name,
      employees: data.employees,
      avgRiskScore: data.employees > 0 
        ? Math.round(data.totalRiskScore / data.employees) 
        : 0,
      highRiskCount: data.highRisk,
      mediumRiskCount: data.mediumRisk,
      lowRiskCount: data.lowRisk,
      riskDistribution: {
        high: data.employees > 0 ? Math.round((data.highRisk / data.employees) * 100) : 0,
        medium: data.employees > 0 ? Math.round((data.mediumRisk / data.employees) * 100) : 0,
        low: data.employees > 0 ? Math.round((data.lowRisk / data.employees) * 100) : 0,
      },
    })).sort((a, b) => b.avgRiskScore - a.avgRiskScore);

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch department risk analysis' });
    }
  }
};
