import SimulationResult from '../models/SimulationResult.js';
import { Campaign } from '../models/Campaign.js';
import { User } from '../models/User.js';
import { UserGame } from '../models/UserGame.js';
import { UserQuiz } from '../models/UserQuiz.js';
import mongoose from 'mongoose';
import { computeUserRiskProfile } from './riskEngine.js';
import { evaluateAchievements } from './achievementService.js';
// PERIOD DATE RANGE HELPER
// Converts period string to a start date for filtering
// ─────────────────────────────────────────────────────────────────────────────
export function getPeriodDateRange(period?: string): Date | undefined {
  if (!period || period === 'all') return undefined;
  const now = new Date();
  const start = new Date();
  if (period === 'week') start.setDate(now.getDate() - 7);
  if (period === 'month') start.setMonth(now.getMonth() - 1);
  if (period === 'quarter') start.setMonth(now.getMonth() - 3);
  if (period === 'year') start.setFullYear(now.getFullYear() - 1);
  return start;
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK SCORE — Industry-aligned formula (KnowBe4 / SANS / Proofpoint)
//
//   credentials submitted → 60 weight (highest risk)
//   link clicked only     → 30 weight (medium risk)
//   ignored / no action   →  5 weight (slight risk — unaware)
//   reported              → -20 weight (reduces risk — shows awareness)
//
// Score range: 0–100
//   0–15  = Low    (phish-prone % under 15%)
//   16–35 = Medium (phish-prone % 16–35%)
//   36+   = High   (phish-prone % over 36%)
// ─────────────────────────────────────────────────────────────────────────────
export function calculateRiskScore(
  clicks: number,
  credentials: number,
  reports: number,
  total: number
): number {
  if (total === 0) return 0;

  const ignored = Math.max(0, total - clicks - credentials - reports);

  const clickRate = clicks / total;
  const credentialRate = credentials / total;
  const reportRate = reports / total;
  const ignoreRate = ignored / total;

  const raw =
    (credentialRate * 60) +
    (clickRate * 30) +
    (ignoreRate * 5) -
    (reportRate * 20);

  return Math.min(100, Math.max(0, Math.round(raw)));
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK LEVEL — 5-tier Enterprise Model
// ─────────────────────────────────────────────────────────────────────────────
export function getRiskLevel(score: number): 'very_low' | 'low' | 'moderate' | 'high' | 'critical' {
  if (score <= 25) return 'very_low';
  if (score <= 50) return 'low';
  if (score <= 70) return 'moderate';
  if (score <= 85) return 'high';
  return 'critical';
}

// ─────────────────────────────────────────────────────────────────────────────
// POINTS SYSTEM — Consistent with risk weights
// ─────────────────────────────────────────────────────────────────────────────
export function calculatePoints(
  currentPoints: number,
  action:
    | 'click'
    | 'credentials'
    | 'report'
    | 'ignored'
    | 'video_completed'
    | 'quiz_90'
    | 'quiz_75'
    | 'quiz_60'
    | 'quiz_40'
    | 'quiz_0'
    | 'game_played'
    | 'game_high_score'
): number {
  const safePoints = Number.isFinite(currentPoints) ? currentPoints : 0;

  const delta =
    action === 'report' ? +50 :
    action === 'ignored' ? +5 :
    action === 'click' ? -30 :
    action === 'credentials' ? -60 :
    action === 'video_completed' ? +10 :
    action === 'quiz_90' ? +30 :
    action === 'quiz_75' ? +20 :
    action === 'quiz_60' ? +15 :
    action === 'quiz_40' ? +8 :
    action === 'quiz_0' ? +3 :
    action === 'game_played' ? +5 :
    action === 'game_high_score' ? +15 :
    0;

  return Math.max(0, safePoints + delta);
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE — Based on accumulated points
// ─────────────────────────────────────────────────────────────────────────────
export function calculateBadge(points: number): string {
  if (points >= 1000) return 'Security Champion';
  if (points >= 500) return 'Security Expert';
  if (points >= 250) return 'Security Aware';
  if (points >= 100) return 'Security Learner';
  return 'Rookie';
}

// ─────────────────────────────────────────────────────────────────────────────
// RECALCULATE USER RISK
// Called by the queue worker after each simulation event.
// This is the ONLY place that writes risk fields to User.
// Computing for display (computeUserAnalytics) never writes.
// ─────────────────────────────────────────────────────────────────────────────
export async function recalculateUserRisk(userId: string): Promise<void> {
  const profile = await computeUserRiskProfile(userId);

  await User.findByIdAndUpdate(userId, {
    riskScore:        profile.riskScore,
    riskLevel:        profile.riskLevel,
    riskTrend:        profile.trend,
    riskConfidence:   profile.confidence,
    riskBreakdown:    profile.breakdown,
    riskCalculatedAt: profile.riskCalculatedAt,
  });

  // After every risk recalculation, check zero-click achievement
  // (this is the batch path — runs after the full profile is computed)
  const earned = await evaluateAchievements(userId, 'risk_recalc');
  if (earned.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { achievements: { $each: earned } },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE USER POINTS
// ─────────────────────────────────────────────────────────────────────────────
export async function updateUserPoints(
  userId: string,
  action:
    | 'click'
    | 'credentials'
    | 'report'
    | 'ignored'
    | 'video_completed'
    | 'quiz_90'
    | 'quiz_75'
    | 'quiz_60'
    | 'quiz_40'
    | 'quiz_0'
    | 'game_played'
    | 'game_high_score'
): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  if (action === 'game_played' || action === 'game_high_score') {
    const count = await UserGame.countDocuments({ userId, createdAt: { $gte: startOfDay } });
    if (count >= 5) return;
  } else if (action.startsWith('quiz_')) {
    const count = await UserQuiz.countDocuments({ userId, createdAt: { $gte: startOfDay } });
    if (count >= 5) return;
  }

  const user = await User.findById(userId).select('points achievements').lean() as any;
  if (!user) return;

  const newPoints = calculatePoints(user.points ?? 0, action);
  const badge = calculateBadge(newPoints);

  // Route achievement checks through achievementService.
  // Only checks relevant to the current trigger are run.
  const newAchievements = await evaluateAchievements(userId, action);

  await User.findByIdAndUpdate(userId, {
    points: newPoints,
    badge,
    ...(newAchievements.length > 0
      ? { $addToSet: { achievements: { $each: newAchievements } } }
      : {}),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Get campaign IDs for company (or all if no companyId)
// ─────────────────────────────────────────────────────────────────────────────
export async function getCampaignIdsForCompany(
  companyId?: string
): Promise<mongoose.Types.ObjectId[]> {
  const query = companyId ? { companyId } : {};
  const campaigns = await Campaign.find(query).select('_id').lean();
  return campaigns.map(c => c._id as mongoose.Types.ObjectId);
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ✅ Now accepts period param — filters simulation results by date range
// ─────────────────────────────────────────────────────────────────────────────
export async function computeDashboardStats(
  companyId?: string,
  period?: string       // ✅ new param
) {
  const campaignIds = await getCampaignIdsForCompany(companyId);
  const startDate = getPeriodDateRange(period);           // ✅ get date range

  // ✅ Build match stage with optional date filter
  const matchStage: any = { campaignId: { $in: campaignIds } };
  if (startDate) matchStage.createdAt = { $gte: startDate };

  const [agg] = await SimulationResult.aggregate([
    { $match: matchStage },                                  // ✅ was just campaignId filter
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        clicks: {
          $sum: {
            $cond: [{
              $or: [
                { $eq: ['$smsLinkClicked', true] },
                { $eq: ['$linkClicked', true] },
              ]
            }, 1, 0],
          },
        },
        credentials: {
          $sum: { $cond: [{ $eq: ['$credentialsSubmitted', true] }, 1, 0] },
        },
        reports: {
          $sum: {
            $cond: [{
              $or: [
                { $eq: ['$reportedPhishing', true] },
                { $eq: ['$voiceReported', true] },
              ]
            }, 1, 0],
          },
        },
        smsSent: { $sum: { $cond: [{ $eq: ['$smsSent', true] }, 1, 0] } },
        smsDelivered: { $sum: { $cond: [{ $eq: ['$smsDelivered', true] }, 1, 0] } },
        callsInit: { $sum: { $cond: [{ $eq: ['$callInitiated', true] }, 1, 0] } },
        callsAnswered: { $sum: { $cond: [{ $eq: ['$callAnswered', true] }, 1, 0] } },
        respExcellent: {
          $sum: {
            $cond: [
              { $and: [
                { $ne: ['$reportedAt', null] },
                { $lt: [ { $subtract: ['$reportedAt', { $ifNull: ['$smsSentAt', { $ifNull: ['$callInitiatedAt', '$createdAt'] }] }] }, 300000 ] }
              ]}, 1, 0
            ]
          }
        },
        respGood: {
          $sum: {
            $cond: [
              { $and: [
                { $ne: ['$reportedAt', null] },
                { $gte: [ { $subtract: ['$reportedAt', { $ifNull: ['$smsSentAt', { $ifNull: ['$callInitiatedAt', '$createdAt'] }] }] }, 300000 ] },
                { $lt: [ { $subtract: ['$reportedAt', { $ifNull: ['$smsSentAt', { $ifNull: ['$callInitiatedAt', '$createdAt'] }] }] }, 1800000 ] }
              ]}, 1, 0
            ]
          }
        },
        respAverage: {
          $sum: {
            $cond: [
              { $and: [
                { $ne: ['$reportedAt', null] },
                { $gte: [ { $subtract: ['$reportedAt', { $ifNull: ['$smsSentAt', { $ifNull: ['$callInitiatedAt', '$createdAt'] }] }] }, 1800000 ] },
                { $lt: [ { $subtract: ['$reportedAt', { $ifNull: ['$smsSentAt', { $ifNull: ['$callInitiatedAt', '$createdAt'] }] }] }, 10800000 ] }
              ]}, 1, 0
            ]
          }
        },
      },
    },
  ]);

  const s = agg ?? {
    total: 0, clicks: 0, credentials: 0, reports: 0,
    smsSent: 0, smsDelivered: 0, callsInit: 0, callsAnswered: 0,
    respExcellent: 0, respGood: 0, respAverage: 0
  };

  const pct = (n: number, d: number) =>
    d > 0 ? Math.round((n / d) * 1000) / 10 : 0;

  const companyFilter = companyId ? { companyId: new mongoose.Types.ObjectId(companyId) } : {};

  const [totalEmployees, totalCampaigns, activeCampaigns, riskCounts] = await Promise.all([
    User.countDocuments({ ...companyFilter, role: 'employee' }),
    Campaign.countDocuments(companyFilter),
    Campaign.countDocuments({ ...companyFilter, status: 'active' }),
    User.aggregate([
      { $match: { ...companyFilter, role: 'employee' } },
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
    ]),
  ]);

const riskDist = { very_low: 0, low: 0, moderate: 0, high: 0, critical: 0 };
riskCounts.forEach((r: any) => {
  // ✅ cast to specific type first
  const level = r._id as 'very_low' | 'low' | 'moderate' | 'high' | 'critical';
  if (['very_low', 'low', 'moderate', 'high', 'critical'].includes(level)) {
    riskDist[level] = r.count;
  }
});

  const phishProneRate = pct(s.clicks, s.total);

  return {
    totalEmployees,
    totalCampaigns,
    activeCampaigns,
    totalSimulations: s.total,
    totalClicks: s.clicks,
    totalReports: s.reports,
    totalCompromised: s.credentials,
    phishProneRate,                              // ✅ industry primary KPI
    avgClickRate: phishProneRate,           // alias
    avgReportRate: pct(s.reports, s.total),
    avgCompromiseRate: pct(s.credentials, s.total),
    trainingProgress: pct(s.reports, Math.max(totalEmployees, 1)),
    overallRiskScore: calculateRiskScore(s.clicks, s.credentials, s.reports, s.total),
    riskDistribution: riskDist,
    responseTimeBuckets: {
      excellent: s.respExcellent || 0,
      good: s.respGood || 0,
      average: s.respAverage || 0,
      poor: Math.max(0, s.total - (s.respExcellent || 0) - (s.respGood || 0) - (s.respAverage || 0)),
    },
    period: period || 'all',                     // ✅ echo back period for UI
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION ANALYTICS
// ✅ Now accepts period param
// ─────────────────────────────────────────────────────────────────────────────
export async function computeSimulationAnalytics(
  companyId?: string,
  period?: string       // ✅ new param
) {
  const campaignIds = await getCampaignIdsForCompany(companyId);
  const startDate = getPeriodDateRange(period);

  // ✅ Build match stage with optional date filter
  const matchStage: any = { campaignId: { $in: campaignIds } };
  if (startDate) matchStage.createdAt = { $gte: startDate };

  const results = await SimulationResult.aggregate([
    { $match: matchStage },                                  // ✅ was just campaignId filter
    {
      $group: {
        _id: '$simulationType',
        total: { $sum: 1 },
        clicks: {
          $sum: {
            $cond: [{
              $or: [
                { $eq: ['$smsLinkClicked', true] },
                { $eq: ['$linkClicked', true] },
              ]
            }, 1, 0],
          },
        },
        credentials: {
          $sum: { $cond: [{ $eq: ['$credentialsSubmitted', true] }, 1, 0] },
        },
        reports: {
          $sum: {
            $cond: [{
              $or: [
                { $eq: ['$reportedPhishing', true] },
                { $eq: ['$voiceReported', true] },
              ]
            }, 1, 0],
          },
        },
        smsSent: { $sum: { $cond: [{ $eq: ['$smsSent', true] }, 1, 0] } },
        smsDelivered: { $sum: { $cond: [{ $eq: ['$smsDelivered', true] }, 1, 0] } },
        callInit: { $sum: { $cond: [{ $eq: ['$callInitiated', true] }, 1, 0] } },
        callAnswered: { $sum: { $cond: [{ $eq: ['$callAnswered', true] }, 1, 0] } },
        voiceEngaged: {
          $sum: {
            $cond: [{
              $or: [
                { $eq: ['$voiceEngaged', true] },
                { $eq: ['$voiceVerified', true] },
              ]
            }, 1, 0],
          },
        },
      },
    },
  ]);

  const byType: Record<string, any> = {};
  results.forEach((r: any) => { byType[r._id] = r; });

  const ph = byType['phishing'] ?? {};
  const sm = byType['smishing'] ?? {};
  const vi = byType['vishing'] ?? {};

  const pct = (n = 0, d = 0) => d > 0 ? Math.round((n / d) * 100) : 0;

  const totalAll = (ph.total ?? 0) + (sm.total ?? 0) + (vi.total ?? 0);
  const clicksAll = (ph.clicks ?? 0) + (sm.clicks ?? 0) + (vi.voiceEngaged ?? 0);
  const credentialsAll = (ph.credentials ?? 0) + (sm.credentials ?? 0);
  const reportsAll = (ph.reports ?? 0) + (sm.reports ?? 0) + (vi.reports ?? 0);

  return {
    phishing: {
      total: ph.total ?? 0,
      clicked: ph.clicks ?? 0,
      compromised: ph.credentials ?? 0,
      reported: ph.reports ?? 0,
      clickRate: pct(ph.clicks, ph.total),
      compromiseRate: pct(ph.credentials, ph.total),
      reportRate: pct(ph.reports, ph.total),
    },
    smishing: {
      sent: sm.smsSent ?? sm.total ?? 0,
      delivered: sm.smsDelivered ?? 0,
      clicked: sm.clicks ?? 0,
      compromised: sm.credentials ?? 0,
      reported: sm.reports ?? 0,
      deliveryRate: pct(sm.smsDelivered, sm.smsSent ?? sm.total),
      clickRate: pct(sm.clicks, sm.smsDelivered ?? sm.total),
      compromiseRate: pct(sm.credentials, sm.clicks),
      reportRate: pct(sm.reports, sm.smsDelivered ?? sm.total),
    },
    vishing: {
      initiated: vi.callInit ?? vi.total ?? 0,
      answered: vi.callAnswered ?? 0,
      engaged: vi.voiceEngaged ?? 0,
      reported: vi.reports ?? 0,
      answerRate: pct(vi.callAnswered, vi.callInit ?? vi.total),
      engagementRate: pct(vi.voiceEngaged, vi.callAnswered),
      reportRate: pct(vi.reports, vi.callAnswered),
    },
    summary: {
      totalSimulations: totalAll,
      totalCompromised: credentialsAll,
      totalReported: reportsAll,
      overallRiskScore: calculateRiskScore(clicksAll, credentialsAll, reportsAll, totalAll),
    },
    period: period || 'all',                                 // ✅ echo back
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT RISK
// ✅ Now accepts period param
// ─────────────────────────────────────────────────────────────────────────────
export async function computeDepartmentRisk(
  companyId?: string,
  period?: string       // ✅ new param
) {
  const companyFilter = companyId ? { companyId: new mongoose.Types.ObjectId(companyId) } : {};
  const campaignIds = await getCampaignIdsForCompany(companyId);
  const startDate = getPeriodDateRange(period);

  // ✅ Build match stage with optional date filter
  const matchStage: any = { campaignId: { $in: campaignIds } };
  if (startDate) matchStage.createdAt = { $gte: startDate };

  const userSimStats = await SimulationResult.aggregate([
    { $match: matchStage },                                  // ✅ was just campaignId filter
    {
      $group: {
        _id: '$userId',
        total: { $sum: 1 },
        clicks: {
          $sum: {
            $cond: [{
              $or: [
                { $eq: ['$smsLinkClicked', true] },
                { $eq: ['$linkClicked', true] },
              ]
            }, 1, 0],
          },
        },
        credentials: {
          $sum: { $cond: [{ $eq: ['$credentialsSubmitted', true] }, 1, 0] },
        },
        reports: {
          $sum: {
            $cond: [{
              $or: [
                { $eq: ['$reportedPhishing', true] },
                { $eq: ['$voiceReported', true] },
              ]
            }, 1, 0],
          },
        },
      },
    },
  ]);

  const simMap: Record<string, {
    total: number; clicks: number; credentials: number; reports: number;
  }> = {};
  userSimStats.forEach((s: any) => {
    simMap[s._id.toString()] = {
      total: s.total, clicks: s.clicks,
      credentials: s.credentials, reports: s.reports,
    };
  });

  const users = await User.find({ ...companyFilter, role: 'employee' })
    .select('_id department riskScore riskLevel points')
    .lean();

  const deptMap: Record<string, {
    employees: number;
    totalSims: number;
    totalClicks: number;
    totalCreds: number;
    totalReports: number;
    totalRiskScore: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
    very_low: number;
  }> = {};

  users.forEach((u: any) => {
    const dept = u.department || 'General';
    if (!deptMap[dept]) {
      deptMap[dept] = {
        employees: 0, totalSims: 0, totalClicks: 0,
        totalCreds: 0, totalReports: 0, totalRiskScore: 0,
        critical: 0, high: 0, moderate: 0, low: 0, very_low: 0,
      };
    }

    const d = deptMap[dept];
    const sim = simMap[u._id.toString()] ?? {
      total: 0, clicks: 0, credentials: 0, reports: 0,
    };

    d.employees++;
    d.totalSims += sim.total;
    d.totalClicks += sim.clicks;
    d.totalCreds += sim.credentials;
    d.totalReports += sim.reports;
    d.totalRiskScore += u.riskScore ?? 0;

    // ✅ Use updated 5-tier thresholds via the DB's actual values
    // We already migrated getRiskLevel to riskEngine.ts. Since the value is populated
    // by the risk engine, u.riskLevel should directly be one of the 5 tiers.
    // We use getRiskLevel from riskEngine just in case it's not set.
    const level = u.riskLevel || getRiskLevel(u.riskScore ?? 0);
    if (level === 'critical') d.critical++;
    else if (level === 'high') d.high++;
    else if (level === 'moderate') d.moderate++;
    else if (level === 'low') d.low++;
    else d.very_low++;
  });

  const pct = (n: number, d: number) =>
    d > 0 ? Math.round((n / d) * 100) : 0;

  return Object.entries(deptMap).map(([dept, d]) => ({
    department: dept,
    employees: d.employees,
    totalSims: d.totalSims,
    totalClicks: d.totalClicks,
    totalReports: d.totalReports,
    clickRate: pct(d.totalClicks, d.totalSims),
    reportRate: pct(d.totalReports, d.totalSims),
    compromiseRate: pct(d.totalCreds, d.totalSims),
    avgRiskScore: d.employees > 0
      ? Math.round(d.totalRiskScore / d.employees)
      : 0,
    criticalRiskCount: d.critical,
    highRiskCount: d.high,
    moderateRiskCount: d.moderate,
    lowRiskCount: d.low,
    veryLowRiskCount: d.very_low,
  })).sort((a, b) => b.avgRiskScore - a.avgRiskScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ANALYTICS — Individual employee (no period filter — shows all history)
// ─────────────────────────────────────────────────────────────────────────────
export async function computeUserAnalytics(userId: string, companyId?: string) {
  // ✅ cast lean result as any to avoid strict type errors
  const user = await User.findById(userId)
    .select('-passwordHash')
    .lean() as any;

  if (!user) return null;

  const campaignIds = await getCampaignIdsForCompany(
    companyId || user.companyId?.toString()
  );

  const results = await SimulationResult.find({
    userId,
    campaignId: { $in: campaignIds },
  })
    .populate('campaignId', 'campaignName type')
    .sort({ createdAt: -1 })
    .lean();

  const total = results.length;
  const clicks = results.filter(r => r.smsLinkClicked || r.linkClicked).length;
  const credentials = results.filter(r => r.credentialsSubmitted).length;
  const reports = results.filter(r => r.reportedPhishing || r.voiceReported).length;
  const ignored = Math.max(0, total - clicks - credentials - reports);

  const riskScore = user.riskScore ?? 0;
  const riskLevel = user.riskLevel ?? 'low';
  // NOTE: We intentionally use the STORED riskScore/riskLevel here.
  // computeUserAnalytics() is a READ path — it never writes to User.
  // The risk engine write path is exclusively recalculateUserRisk() in this file.
  // This eliminates the side-effect bug where a dashboard view could update risk
  // independently of the queue-driven recalculation.

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  let rank: number | null = null;
  let percentile: number | null = null;
  if (user.companyId) {
    const [higher, totalInCo] = await Promise.all([
      User.countDocuments({
        companyId: user.companyId,
        points: { $gt: user.points ?? 0 },
        role: 'employee',
      }),
      User.countDocuments({ companyId: user.companyId, role: 'employee' }),
    ]);
    rank = higher + 1;
    percentile = totalInCo > 0
      ? Math.round(((totalInCo - rank + 1) / totalInCo) * 100)
      : 0;
  }

  const history = results.slice(0, 20).map(r => {
    const campaign = r.campaignId as any;
    let action = 'ignored';
    if (r.credentialsSubmitted) action = 'compromised';
    else if (r.smsLinkClicked || r.linkClicked) action = 'clicked';
    else if (r.reportedPhishing || r.voiceReported) action = 'reported';
    else if (r.voiceEngaged || r.voiceVerified) action = 'engaged';

    const start = r.smsSentAt || r.callInitiatedAt || r.createdAt;
    let responseTimeBucket = 'poor';
    if (r.reportedAt && start) {
      const diff = r.reportedAt.getTime() - start.getTime();
      if (diff < 300000) responseTimeBucket = 'excellent';
      else if (diff < 1800000) responseTimeBucket = 'good';
      else if (diff < 10800000) responseTimeBucket = 'average';
    }

    return {
      date: start,
      campaignName: campaign?.campaignName ?? 'Unknown',
      type: r.simulationType || campaign?.type || 'unknown',
      action,
      responseTimeBucket,
      pointsEarned:
        action === 'reported' ? +50 :
          action === 'ignored' ? +5 :
            action === 'clicked' ? -30 :
              action === 'compromised' ? -60 : 0,
    };
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      points: user.points ?? 0,
      badge: user.badge ?? 'Rookie',
      riskScore,
      riskLevel,
      department: user.department,
    },
    stats: {
      totalSimulations: total,
      clicks,
      credentials,
      reports,
      ignored,
      phishProneRate: pct(clicks),
      clickRate: pct(clicks),
      reportRate: pct(reports),
      compromiseRate: pct(credentials),
      safeRate: pct(ignored),
    },
    ranking: { rank, percentile },
    history,
  };
}