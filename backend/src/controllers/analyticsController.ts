// import { Response } from 'express';
// import { Campaign } from '../models/Campaign.js';
// import { SimulationResult } from '../models/SimulationResult.js';
// import { User } from '../models/User.js';
// import { AppError } from '../utils/errorHandler.js';
// import { AuthRequest, ApiResponse, AnalyticsData } from '../types/index.js';

// export const getCompanyAnalytics = async (
//   req: AuthRequest,
//   res: Response<ApiResponse>
// ): Promise<void> => {
//   try {
//     if (!req.user) {
//       throw new AppError('User not authenticated', 401);
//     }

//     const { companyId } = req.query as { companyId: string };

//     if (!companyId) {
//       throw new AppError('Company ID is required', 400);
//     }

//     const campaigns = await Campaign.find({ companyId });
//     const totalCampaigns = campaigns.length;

//     const results = await SimulationResult.find({
//       campaignId: { $in: campaigns.map((c) => c._id) },
//     });

//     const totalParticipants = new Set(results.map((r) => r.userId.toString())).size;
//     const clickCount = results.filter((r) => r.linkClicked).length;
//     const reportCount = results.filter((r) => r.reportedPhishing).length;

//     const averageClickRate = results.length > 0 ? (clickCount / results.length) * 100 : 0;
//     const averageReportRate = results.length > 0 ? (reportCount / results.length) * 100 : 0;

//     const campaignsByType = {
//       phishing: campaigns.filter((c) => c.type === 'phishing').length,
//       smishing: campaigns.filter((c) => c.type === 'smishing').length,
//       vishing: campaigns.filter((c) => c.type === 'vishing').length,
//     };

//     const departments: { [key: string]: { total: number; points: number } } = {};
//     const employees = await User.find({ companyId });

//     employees.forEach((emp) => {
//       if (!departments[emp.department]) {
//         departments[emp.department] = { total: 0, points: 0 };
//       }
//       departments[emp.department].total++;
//       departments[emp.department].points += emp.points;
//     });

//     const topDepartments = Object.entries(departments)
//       .map(([dept, data]) => ({
//         department: dept,
//         score: data.total > 0 ? Math.round(data.points / data.total) : 0,
//       }))
//       .sort((a, b) => b.score - a.score)
//       .slice(0, 5);

//     const analytics: AnalyticsData = {
//       totalCampaigns,
//       totalParticipants,
//       averageClickRate: Math.round(averageClickRate * 100) / 100,
//       averageReportRate: Math.round(averageReportRate * 100) / 100,
//       campaignsByType: campaignsByType as any,
//       topDepartments,
//       trainingProgress: Math.round((reportCount / Math.max(totalParticipants, 1)) * 100),
//     };

//     res.json({
//       success: true,
//       data: analytics,
//     });
//   } catch (error) {
//     if (error instanceof AppError) {
//       res.status(error.statusCode).json({ success: false, error: error.message });
//     } else {
//       res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
//     }
//   }
// };

// export const getGlobalAnalytics = async (
//   req: AuthRequest,
//   res: Response<ApiResponse>
// ): Promise<void> => {
//   try {
//     if (!req.user) {
//       throw new AppError('User not authenticated', 401);
//     }

//     const totalCampaigns = await Campaign.countDocuments();
//     const totalUsers = await User.countDocuments();
//     const allResults = await SimulationResult.find();

//     const clickCount = allResults.filter((r) => r.linkClicked).length;
//     const reportCount = allResults.filter((r) => r.reportedPhishing).length;

//     const averageClickRate =
//       allResults.length > 0 ? (clickCount / allResults.length) * 100 : 0;
//     const averageReportRate =
//       allResults.length > 0 ? (reportCount / allResults.length) * 100 : 0;

//     res.json({
//       success: true,
//       data: {
//         totalCampaigns,
//         totalUsers,
//         totalSimulations: allResults.length,
//         averageClickRate: Math.round(averageClickRate * 100) / 100,
//         averageReportRate: Math.round(averageReportRate * 100) / 100,
//       },
//     });
//   } catch (error) {
//     if (error instanceof AppError) {
//       res.status(error.statusCode).json({ success: false, error: error.message });
//     } else {
//       res.status(500).json({ success: false, error: 'Failed to fetch global analytics' });
//     }
//   }
// };
import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import { SimulationResult } from '../models/SimulationResult.js';
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
