// backend/src/services/campaignAnalyticsService.ts
import SimulationResult from '../models/SimulationResult.js';
// import { User }         from '../models/User.js'; // removed: unused
import { Campaign }     from '../models/Campaign.js';
import mongoose         from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN DETAILED RESULTS
// Shows EVERY user who received this campaign and what they did
// ─────────────────────────────────────────────────────────────────────────────
export async function getCampaignDetailedResults(campaignId: string) {
  const campaign = await Campaign.findById(campaignId).lean();
  if (!campaign) throw new Error('Campaign not found');

  // Get all simulation results for this campaign
  const results = await SimulationResult.find({ campaignId })
    .populate('userId', 'name email department riskScore riskLevel badge points')
    .sort({ createdAt: -1 })
    .lean();

  // Build per-user breakdown
  const userActions = results.map((r: any) => {
    const user = r.userId as any;

    // Determine what action the user took
    let primaryAction = 'ignored';
    let actionTime: Date | undefined;
    let actionDetail = '';

    if (r.credentialsSubmitted) {
      primaryAction = 'compromised';
      actionTime    = r.credentialsSubmittedAt;
      actionDetail  = `Submitted: ${r.formFieldsSubmitted?.join(', ') ?? 'credentials'}`;
    } else if (r.smsLinkClicked || r.linkClicked) {
      primaryAction = 'clicked';
      actionTime    = r.smsClickedAt || r.clickedAt;
      actionDetail  = `IP: ${r.clickIpAddress ?? 'unknown'}`;
    } else if (r.reportedPhishing || r.voiceReported) {
      primaryAction = 'reported';
      actionTime    = r.reportedAt || r.callResponseAt;
      actionDetail  = `Method: ${r.reportMethod ?? 'button'}`;
    } else if (r.voiceEngaged || r.voiceVerified) {
      primaryAction = 'engaged';
      actionTime    = r.callResponseAt;
      actionDetail  = 'Call interaction';
    } else if (r.smsSent || r.emailOpened || r.callInitiated) {
      primaryAction = 'received_no_action';
      actionTime    = r.smsSentAt || r.timestamp || r.createdAt;
    }

    return {
      userId:        user?._id?.toString() ?? r.userId.toString(),
      userName:      user?.name ?? 'Unknown User',
      userEmail:     user?.email ?? '',
      department:    user?.department ?? 'N/A',
      riskScore:     user?.riskScore ?? 0,
      riskLevel:     user?.riskLevel ?? 'low',
      badge:         user?.badge ?? 'Rookie',
      points:        user?.points ?? 0,
      
      // Action details
      action:        primaryAction,
      actionTime:    actionTime,
      actionDetail:  actionDetail,
      
      // Raw tracking data
      sent:          r.smsSent || r.emailOpened || r.callInitiated || false,
      delivered:     r.smsDelivered || r.emailOpened || r.callAnswered || false,
      clicked:       r.smsLinkClicked || r.linkClicked || false,
      compromised:   r.credentialsSubmitted || false,
      reported:      r.reportedPhishing || r.voiceReported || false,
      
      // Timestamps
      sentAt:        r.smsSentAt || r.timestamp || r.createdAt,
      clickedAt:     r.smsClickedAt || r.clickedAt,
      reportedAt:    r.reportedAt,
      compromisedAt: r.credentialsSubmittedAt,
      
      // Additional context
      ipAddress:     r.clickIpAddress,
      userAgent:     r.clickUserAgent,
      template:      r.smsTemplate || r.emailTemplate || r.voiceScript,
    };
  });

  // Calculate campaign-level stats
  const total       = userActions.length;
  const sent        = userActions.filter(u => u.sent).length;
  const delivered   = userActions.filter(u => u.delivered).length;
  const clicked     = userActions.filter(u => u.clicked).length;
  const compromised = userActions.filter(u => u.compromised).length;
  const reported    = userActions.filter(u => u.reported).length;
  const ignored     = total - clicked - reported;

  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0;

  // Group by action type
  const byAction = {
    compromised: userActions.filter(u => u.action === 'compromised'),
    clicked:     userActions.filter(u => u.action === 'clicked'),
    reported:    userActions.filter(u => u.action === 'reported'),
    engaged:     userActions.filter(u => u.action === 'engaged'),
    ignored:     userActions.filter(u => u.action === 'received_no_action' || u.action === 'ignored'),
  };

  // Group by department
  const byDepartment: Record<string, {
    total: number; clicked: number; compromised: number; reported: number;
    clickRate: number; reportRate: number; compromiseRate: number;
  }> = {};

  userActions.forEach(u => {
    const dept = u.department || 'Unknown';
    if (!byDepartment[dept]) {
      byDepartment[dept] = { total: 0, clicked: 0, compromised: 0, reported: 0, clickRate: 0, reportRate: 0, compromiseRate: 0 };
    }
    byDepartment[dept].total++;
    if (u.clicked)     byDepartment[dept].clicked++;
    if (u.compromised) byDepartment[dept].compromised++;
    if (u.reported)    byDepartment[dept].reported++;
  });

  Object.keys(byDepartment).forEach(dept => {
    const d = byDepartment[dept];
    d.clickRate      = pct(d.clicked,     d.total);
    d.reportRate     = pct(d.reported,    d.total);
    d.compromiseRate = pct(d.compromised, d.total);
  });

  // Group by risk level
  const byRiskLevel = {
    high:   userActions.filter(u => u.riskLevel === 'high'),
    medium: userActions.filter(u => u.riskLevel === 'medium'),
    low:    userActions.filter(u => u.riskLevel === 'low'),
  };

  return {
    campaign: {
      id:          campaign._id,
      name:        campaign.campaignName,
      type:        campaign.type,
      status:      campaign.status,
      startDate:   campaign.startDate,
      endDate:     campaign.endDate,
      companyId:   campaign.companyId,
    },
    summary: {
      totalTargeted: total,
      sent,
      delivered,
      clicked,
      compromised,
      reported,
      ignored,
      deliveryRate:   pct(delivered,   sent),
      clickRate:      pct(clicked,     delivered || total),
      compromiseRate: pct(compromised, clicked || total),
      reportRate:     pct(reported,    delivered || total),
      safeRate:       pct(ignored,     total),
    },
    userActions,    // Complete list with all details
    byAction,       // Grouped by what they did
    byDepartment,   // Department-wise breakdown
    byRiskLevel,    // Risk-level breakdown
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN COMPARISON
// Compare multiple campaigns side-by-side
// ─────────────────────────────────────────────────────────────────────────────
export async function compareCampaigns(campaignIds: string[]) {
  const campaigns = await Campaign.find({
    _id: { $in: campaignIds.map(id => new mongoose.Types.ObjectId(id)) },
  }).lean();

  const comparisons = await Promise.all(
    campaigns.map(async (campaign) => {
      const results = await SimulationResult.find({ campaignId: campaign._id }).lean();
      const total       = results.length;
      const clicked     = results.filter(r => r.smsLinkClicked || r.linkClicked).length;
      const compromised = results.filter(r => r.credentialsSubmitted).length;
      const reported    = results.filter(r => r.reportedPhishing || r.voiceReported).length;

      const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

      return {
        campaignId:     campaign._id,
        campaignName:   campaign.campaignName,
        type:           campaign.type,
        status:         campaign.status,
        startDate:      campaign.startDate,
        totalTargeted:  total,
        clickRate:      pct(clicked),
        compromiseRate: pct(compromised),
        reportRate:     pct(reported),
        successScore:   pct(reported) - pct(clicked), // higher = better performance
      };
    })
  );

  return {
    campaigns: comparisons,
    bestPerforming: comparisons.sort((a, b) => b.successScore - a.successScore)[0],
    worstPerforming: comparisons.sort((a, b) => a.successScore - b.successScore)[0],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATE REPORT DATA
// For weekly/monthly/department reports
// ─────────────────────────────────────────────────────────────────────────────
export async function getAggregateReportData(options: {
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  campaignIds?: string[];
  departments?: string[];
}) {
  const { companyId, startDate, endDate, campaignIds, departments } = options;

  // Build campaign filter
  let campaignFilter: any = {};
  if (companyId)    campaignFilter.companyId = companyId;
  if (campaignIds)  campaignFilter._id = { $in: campaignIds.map(id => new mongoose.Types.ObjectId(id)) };
  if (startDate || endDate) {
    campaignFilter.startDate = {};
    if (startDate) campaignFilter.startDate.$gte = startDate;
    if (endDate)   campaignFilter.startDate.$lte = endDate;
  }

  const campaigns = await Campaign.find(campaignFilter).lean();
  const cids      = campaigns.map(c => c._id);

  // Get all simulation results
  const results = await SimulationResult.find({ campaignId: { $in: cids } })
    .populate('userId', 'name email department')
    .lean();

  // Filter by department if specified
  let filteredResults = results;
  if (departments && departments.length > 0) {
    filteredResults = results.filter((r: any) => {
      const user = r.userId as any;
      return user && departments.includes(user.department);
    });
  }

  // Overall stats
  const total       = filteredResults.length;
  const clicked     = filteredResults.filter(r => r.smsLinkClicked || r.linkClicked).length;
  const compromised = filteredResults.filter(r => r.credentialsSubmitted).length;
  const reported    = filteredResults.filter(r => r.reportedPhishing || r.voiceReported).length;

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  // Department breakdown
  const deptStats: Record<string, any> = {};
  filteredResults.forEach((r: any) => {
    const user = r.userId as any;
    const dept = user?.department ?? 'Unknown';
    if (!deptStats[dept]) {
      deptStats[dept] = { total: 0, clicked: 0, compromised: 0, reported: 0 };
    }
    deptStats[dept].total++;
    if (r.smsLinkClicked || r.linkClicked)  deptStats[dept].clicked++;
    if (r.credentialsSubmitted)             deptStats[dept].compromised++;
    if (r.reportedPhishing || r.voiceReported) deptStats[dept].reported++;
  });

  const departmentBreakdown = Object.entries(deptStats).map(([dept, stats]: [string, any]) => ({
    department:     dept,
    total:          stats.total,
    clickRate:      pct(stats.clicked),
    compromiseRate: pct(stats.compromised),
    reportRate:     pct(stats.reported),
  }));

  // Campaign type breakdown
  const typeStats: Record<string, any> = {};
  filteredResults.forEach(r => {
    const type = r.simulationType || 'unknown';
    if (!typeStats[type]) {
      typeStats[type] = { total: 0, clicked: 0, compromised: 0, reported: 0 };
    }
    typeStats[type].total++;
    if (r.smsLinkClicked || r.linkClicked)  typeStats[type].clicked++;
    if (r.credentialsSubmitted)             typeStats[type].compromised++;
    if (r.reportedPhishing || r.voiceReported) typeStats[type].reported++;
  });

  const simulationTypeBreakdown = Object.entries(typeStats).map(([type, stats]: [string, any]) => ({
    type,
    total:          stats.total,
    clickRate:      pct(stats.clicked),
    compromiseRate: pct(stats.compromised),
    reportRate:     pct(stats.reported),
  }));

  return {
    period: {
      startDate,
      endDate,
      totalCampaigns: campaigns.length,
    },
    overall: {
      totalSimulations: total,
      clickRate:        pct(clicked),
      compromiseRate:   pct(compromised),
      reportRate:       pct(reported),
    },
    departmentBreakdown,
    simulationTypeBreakdown,
    campaigns: campaigns.map(c => ({
      id:         c._id,
      name:       c.campaignName,
      type:       c.type,
      startDate:  c.startDate,
      status:     c.status,
    })),
  };
}