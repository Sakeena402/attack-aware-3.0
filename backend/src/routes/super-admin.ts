import { Router } from 'express';
import {
  getAllCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../controllers/companyController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { Campaign } from '../models/Campaign.js';
import {
  computeDashboardStats,
  computeSimulationAnalytics,
  computeDepartmentRisk,
} from '../services/analyticsService.js';

const superAdminRouter = Router();
superAdminRouter.use(authenticate, requireSuperAdmin);

// ── Company Management ────────────────────────────────────────────────────────
superAdminRouter.get('/companies',     getAllCompanies);
superAdminRouter.post('/companies',    createCompany);
superAdminRouter.get('/companies/:id', getCompany);
superAdminRouter.patch('/companies/:id', updateCompany);
superAdminRouter.put('/companies/:id',   updateCompany);
superAdminRouter.delete('/companies/:id', deleteCompany);

// ── Global Analytics — REAL DATA, no companyId filter ────────────────────────
superAdminRouter.get('/analytics/global', async (req, res) => {
  try {
    // All computed with companyId = undefined → queries ALL companies
    const [dashboard, simulations, companies, monthlyGrowth, industryDist] = await Promise.all([

      // 1. Dashboard stats across ALL companies
      computeDashboardStats(undefined),

      // 2. Simulation analytics across ALL companies
      computeSimulationAnalytics(undefined),

      // 3. All companies with employee counts
      Company.find().lean(),

      // 4. Monthly company registration — last 6 months (REAL data)
      Company.aggregate([
        {
          $group: {
            _id: {
              year:  { $year:  '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),

      // 5. Companies by industry — REAL data
      Company.aggregate([
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Format monthly growth for chart
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const platformGrowth = monthlyGrowth.map((m: any) => ({
      month: monthNames[(m._id.month - 1)],
      companies: m.count,
      year: m._id.year,
    }));

    // Format industry distribution for pie chart
    const industryData = industryDist.map((i: any) => ({
      name: i._id || 'Unknown',
      value: i.count,
    }));

    res.json({
      success: true,
      data: {
        // Quick stats for metric cards
        totalCompanies:    companies.length,
        totalEmployees:    dashboard.totalEmployees,
        activeCampaigns:   dashboard.activeCampaigns,
        totalCampaigns:    dashboard.totalCampaigns,
        globalClickRate:   dashboard.avgClickRate,
        globalReportRate:  dashboard.avgReportRate,
        globalRiskScore:   simulations.summary.overallRiskScore,
        totalSimulations:  simulations.summary.totalSimulations,
        totalCompromised:  simulations.summary.totalCompromised,
        totalReported:     simulations.summary.totalReported,

        // Chart data — REAL from DB
        platformGrowth,
        industryData,

        // Full simulation breakdown
        simulations,

        // Risk distribution
        riskDistribution: dashboard.riskDistribution,
      },
    });
  } catch (err: any) {
    console.error('Global analytics error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch global analytics' });
  }
});

// ── Platform Users ────────────────────────────────────────────────────────────
superAdminRouter.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').lean();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// ── System Health ─────────────────────────────────────────────────────────────
superAdminRouter.get('/system/health', async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date(),
    },
  });
});

export default superAdminRouter;