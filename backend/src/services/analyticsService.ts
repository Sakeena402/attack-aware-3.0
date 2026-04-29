// backend/src/services/analyticsService.ts

import SimulationResult from '../models/SimulationResult.js';
import { Campaign }     from '../models/Campaign.js';
import { User }         from '../models/User.js';
import mongoose         from 'mongoose';


export function calculateRiskScore(
  clicks: number,
  credentials: number,
  reports: number,
  total: number
): number {
  // Guard: no simulations yet → no risk score
  if (total === 0) return 0;

  const clickRate      = clicks      / total;
  const credentialRate = credentials / total;
  const reportRate     = reports     / total;

  const raw = (clickRate * 40) + (credentialRate * 50) - (reportRate * 30);
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 30) return 'low';
  if (score <= 70) return 'medium';
  return 'high';
}

// ─────────────────────────────────────────────────────────────────────────────
// POINTS SYSTEM (separate from risk — gamification)
// Points reflect positive behaviour cumulatively, but risk reflects proportion
// ─────────────────────────────────────────────────────────────────────────────
// export function calculatePoints(
//   currentPoints: number,
//   action: 'click' | 'credentials' | 'report'
// ): number {
//   const delta =
//     action === 'report'      ? +10  :
//     action === 'click'       ? -20  :
//     action === 'credentials' ? -40  : 0;
//   return Math.max(0, currentPoints + delta);
// }

export function calculatePoints(
  currentPoints: number,
  action: 'click' | 'credentials' | 'report'
): number {
  const safePoints = Number.isFinite(currentPoints) ? currentPoints : 0;

  const delta =
    action === 'report'      ? +10  :
    action === 'click'       ? -20  :
    action === 'credentials' ? -40  : 0;

  return Math.max(0, safePoints + delta);
}

export function calculateBadge(points: number): string {
  if (points >= 1000) return 'Security Champion';
  if (points >= 500)  return 'Security Expert';
  if (points >= 250)  return 'Security Aware';
  if (points >= 100)  return 'Security Learner';
  return 'Rookie';
}

export async function recalculateUserRisk(userId: string): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [agg] = await SimulationResult.aggregate([
    {
      
      $match: { userId: userObjectId },
    },
    {
      $group: {
        _id: null,

        // Total number of simulation documents for this user
        total: { $sum: 1 },

        // CLICK: a user "clicked" if EITHER smsLinkClicked (smishing)
        //        OR linkClicked (phishing) is true on a document.
        //        These are mutually exclusive per simulationType,
        //        so counting both is safe — no double-count.
        clicks: {
          $sum: {
            $cond: [
              { $or: [
                { $eq: ['$smsLinkClicked', true] },
                { $eq: ['$linkClicked',    true] },
              ]},
              1, 0,
            ],
          },
        },

        // CREDENTIALS: only credentialsSubmitted field — single field, no ambiguity
        credentials: {
          $sum: { $cond: [{ $eq: ['$credentialsSubmitted', true] }, 1, 0] },
        },

        // REPORTS: reportedPhishing (phishing/smishing) OR voiceReported (vishing)
        //          These can theoretically both be true on a vishing document,
        //          but in practice we only set one — use OR safely
        reports: {
          $sum: {
            $cond: [
              { $or: [
                { $eq: ['$reportedPhishing', true] },
                { $eq: ['$voiceReported',    true] },
              ]},
              1, 0,
            ],
          },
        },
      },
    },
  ]);

  // Debug log — remove in production once verified
  console.log(`[RISK] userId=${userId} agg=`, agg ?? 'NO_RESULTS');

  const total       = agg?.total       ?? 0;
  const clicks      = agg?.clicks      ?? 0;
  const credentials = agg?.credentials ?? 0;
  const reports     = agg?.reports     ?? 0;

  console.log(`[RISK] total=${total} clicks=${clicks} credentials=${credentials} reports=${reports}`);

  const riskScore = calculateRiskScore(clicks, credentials, reports, total);
  const riskLevel = getRiskLevel(riskScore);

  console.log(`[RISK] riskScore=${riskScore} riskLevel=${riskLevel}`);

  // Update User document — only riskScore and riskLevel
  // Points are updated separately in tracking events to avoid double-counting
  await User.findByIdAndUpdate(userId, {
    riskScore,
    riskLevel,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE USER POINTS — called separately from risk recalculation
// Points are incremental (badge/gamification), risk is rate-based
// ─────────────────────────────────────────────────────────────────────────────
export async function updateUserPoints(
  userId: string,
  action: 'click' | 'credentials' | 'report'
): Promise<void> {
  const user = await User.findById(userId).select('points').lean();
  if (!user) return;

  const newPoints = calculatePoints(user.points ?? 0, action);
  const badge     = calculateBadge(newPoints);

  await User.findByIdAndUpdate(userId, { points: newPoints, badge });

  console.log(`[POINTS] userId=${userId} action=${action} old=${user.points} new=${newPoints} badge=${badge}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS used by analyticsController
// ─────────────────────────────────────────────────────────────────────────────
export async function getCampaignIdsForCompany(
  companyId?: string
): Promise<mongoose.Types.ObjectId[]> {
  const query = companyId ? { companyId } : {};
  const campaigns = await Campaign.find(query).select('_id').lean();
  return campaigns.map(c => c._id as mongoose.Types.ObjectId);
}

export async function computeDashboardStats(companyId?: string) {
  const campaignIds = await getCampaignIdsForCompany(companyId);

  const [agg] = await SimulationResult.aggregate([
    { $match: { campaignId: { $in: campaignIds } } },
    {
      $group: {
        _id: null,
        total:       { $sum: 1 },
        clicks:      {
          $sum: {
            $cond: [{ $or: [
              { $eq: ['$smsLinkClicked', true] },
              { $eq: ['$linkClicked',    true] },
            ]}, 1, 0],
          },
        },
        credentials: { $sum: { $cond: [{ $eq: ['$credentialsSubmitted', true] }, 1, 0] } },
        reports:     {
          $sum: {
            $cond: [{ $or: [
              { $eq: ['$reportedPhishing', true] },
              { $eq: ['$voiceReported',    true] },
            ]}, 1, 0],
          },
        },
        smsSent:      { $sum: { $cond: [{ $eq: ['$smsSent',      true] }, 1, 0] } },
        smsDelivered: { $sum: { $cond: [{ $eq: ['$smsDelivered', true] }, 1, 0] } },
        callsInit:    { $sum: { $cond: [{ $eq: ['$callInitiated',true] }, 1, 0] } },
        callsAnswered:{ $sum: { $cond: [{ $eq: ['$callAnswered', true] }, 1, 0] } },
      },
    },
  ]);

  const s = agg ?? { total: 0, clicks: 0, credentials: 0, reports: 0, smsSent: 0, smsDelivered: 0, callsInit: 0, callsAnswered: 0 };
  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0;

  const companyFilter = companyId ? { companyId } : {};
  const [totalEmployees, totalCampaigns, activeCampaigns, riskCounts] = await Promise.all([
    User.countDocuments({ ...companyFilter, role: 'employee' }),
    Campaign.countDocuments(companyFilter),
    Campaign.countDocuments({ ...companyFilter, status: 'active' }),
    User.aggregate([
      { $match: { ...companyFilter, role: 'employee' } },
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
    ]),
  ]);

  const riskDist = { low: 0, medium: 0, high: 0 };
  riskCounts.forEach((r: any) => {
    if (r._id === 'low' || r._id === 'medium' || r._id === 'high') riskDist[r._id] = r.count;
  });

  return {
    totalEmployees,
    totalCampaigns,
    activeCampaigns,
    totalSimulations:  s.total,
    totalClicks:       s.clicks,
    totalReports:      s.reports,
    totalCompromised:  s.credentials,
    avgClickRate:      pct(s.clicks,      s.total),
    avgReportRate:     pct(s.reports,     s.total),
    avgCompromiseRate: pct(s.credentials, s.total),
    riskDistribution:  riskDist,
    trainingProgress:  pct(s.reports, Math.max(totalEmployees, 1)),
  };
}

export async function computeSimulationAnalytics(companyId?: string) {
  const campaignIds = await getCampaignIdsForCompany(companyId);

  const results = await SimulationResult.aggregate([
    { $match: { campaignId: { $in: campaignIds } } },
    {
      $group: {
        _id: '$simulationType',
        total:       { $sum: 1 },
        clicks:      {
          $sum: {
            $cond: [{ $or: [
              { $eq: ['$smsLinkClicked', true] },
              { $eq: ['$linkClicked',    true] },
            ]}, 1, 0],
          },
        },
        credentials: { $sum: { $cond: [{ $eq: ['$credentialsSubmitted', true] }, 1, 0] } },
        reports:     {
          $sum: {
            $cond: [{ $or: [
              { $eq: ['$reportedPhishing', true] },
              { $eq: ['$voiceReported',    true] },
            ]}, 1, 0],
          },
        },
        smsSent:      { $sum: { $cond: [{ $eq: ['$smsSent',      true] }, 1, 0] } },
        smsDelivered: { $sum: { $cond: [{ $eq: ['$smsDelivered', true] }, 1, 0] } },
        callInit:     { $sum: { $cond: [{ $eq: ['$callInitiated',true] }, 1, 0] } },
        callAnswered: { $sum: { $cond: [{ $eq: ['$callAnswered', true] }, 1, 0] } },
        voiceEngaged: {
          $sum: {
            $cond: [{ $or: [
              { $eq: ['$voiceEngaged',  true] },
              { $eq: ['$voiceVerified', true] },
            ]}, 1, 0],
          },
        },
      },
    },
  ]);

  const byType: Record<string, any> = {};
  results.forEach((r: any) => { byType[r._id] = r; });

  const ph = byType['phishing'] ?? {};
  const sm = byType['smishing'] ?? {};
  const vi = byType['vishing']  ?? {};

  const pct = (n = 0, d = 0) => d > 0 ? Math.round((n / d) * 100) : 0;

  return {
    phishing: {
      total:          ph.total ?? 0,
      clicked:        ph.clicks ?? 0,
      compromised:    ph.credentials ?? 0,
      reported:       ph.reports ?? 0,
      clickRate:      pct(ph.clicks,       ph.total),
      compromiseRate: pct(ph.credentials,  ph.total),
      reportRate:     pct(ph.reports,      ph.total),
    },
    smishing: {
      sent:           sm.smsSent    ?? sm.total ?? 0,
      delivered:      sm.smsDelivered ?? 0,
      clicked:        sm.clicks     ?? 0,
      compromised:    sm.credentials ?? 0,
      reported:       sm.reports    ?? 0,
      deliveryRate:   pct(sm.smsDelivered, sm.smsSent ?? sm.total),
      clickRate:      pct(sm.clicks,       sm.smsDelivered ?? sm.total),
      compromiseRate: pct(sm.credentials,  sm.clicks),
      reportRate:     pct(sm.reports,      sm.smsDelivered ?? sm.total),
    },
    vishing: {
      initiated:      vi.callInit   ?? vi.total ?? 0,
      answered:       vi.callAnswered ?? 0,
      engaged:        vi.voiceEngaged ?? 0,
      reported:       vi.reports    ?? 0,
      answerRate:     pct(vi.callAnswered, vi.callInit ?? vi.total),
      engagementRate: pct(vi.voiceEngaged, vi.callAnswered),
      reportRate:     pct(vi.reports,      vi.callAnswered),
    },
    summary: {
      totalSimulations: (ph.total ?? 0) + (sm.total ?? 0) + (vi.total ?? 0),
      totalCompromised: (ph.credentials ?? 0) + (sm.credentials ?? 0) + (vi.voiceEngaged ?? 0),
      totalReported:    (ph.reports ?? 0) + (sm.reports ?? 0) + (vi.reports ?? 0),
      overallRiskScore: (() => {
        const t = (ph.total ?? 0) + (sm.total ?? 0) + (vi.total ?? 0);
        const c = (ph.clicks ?? 0) + (sm.clicks ?? 0) + (vi.voiceEngaged ?? 0);
        const cr = (ph.credentials ?? 0) + (sm.credentials ?? 0);
        const r = (ph.reports ?? 0) + (sm.reports ?? 0) + (vi.reports ?? 0);
        return calculateRiskScore(c, cr, r, t);
      })(),
    },
  };
}

export async function computeDepartmentRisk(companyId?: string) {
  const companyFilter = companyId ? { companyId } : {};
  const campaignIds   = await getCampaignIdsForCompany(companyId);

  const userSimStats = await SimulationResult.aggregate([
    { $match: { campaignId: { $in: campaignIds } } },
    {
      $group: {
        _id:         '$userId',
        total:       { $sum: 1 },
        clicks:      {
          $sum: {
            $cond: [{ $or: [
              { $eq: ['$smsLinkClicked', true] },
              { $eq: ['$linkClicked',    true] },
            ]}, 1, 0],
          },
        },
        credentials: { $sum: { $cond: [{ $eq: ['$credentialsSubmitted', true] }, 1, 0] } },
        reports:     {
          $sum: {
            $cond: [{ $or: [
              { $eq: ['$reportedPhishing', true] },
              { $eq: ['$voiceReported',    true] },
            ]}, 1, 0],
          },
        },
      },
    },
  ]);

  const simMap: Record<string, { total: number; clicks: number; credentials: number; reports: number }> = {};
  userSimStats.forEach((s: any) => {
    simMap[s._id.toString()] = { total: s.total, clicks: s.clicks, credentials: s.credentials, reports: s.reports };
  });

  const users = await User.find({ ...companyFilter, role: 'employee' })
    .select('_id department riskScore riskLevel points')
    .lean();

  const deptMap: Record<string, {
    employees: number; totalSims: number; totalClicks: number;
    totalCreds: number; totalReports: number; totalRiskScore: number;
    high: number; medium: number; low: number;
  }> = {};

  users.forEach((u: any) => {
    const dept = u.department || 'General';
    if (!deptMap[dept]) deptMap[dept] = {
      employees: 0, totalSims: 0, totalClicks: 0,
      totalCreds: 0, totalReports: 0, totalRiskScore: 0,
      high: 0, medium: 0, low: 0,
    };
    const d   = deptMap[dept];
    const sim = simMap[u._id.toString()] ?? { total: 0, clicks: 0, credentials: 0, reports: 0 };

    d.employees++;
    d.totalSims        += sim.total;
    d.totalClicks      += sim.clicks;
    d.totalCreds       += sim.credentials;
    d.totalReports     += sim.reports;
    d.totalRiskScore   += u.riskScore ?? 0;

    if (u.riskLevel === 'high')        d.high++;
    else if (u.riskLevel === 'medium') d.medium++;
    else                               d.low++;
  });

  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;

  return Object.entries(deptMap).map(([dept, d]) => ({
    department:      dept,
    employees:       d.employees,
    totalSims:       d.totalSims,
    totalClicks:     d.totalClicks,
    totalReports:    d.totalReports,
    clickRate:       pct(d.totalClicks,  d.totalSims),
    reportRate:      pct(d.totalReports, d.totalSims),
    compromiseRate:  pct(d.totalCreds,   d.totalSims),
    avgRiskScore:    d.employees > 0 ? Math.round(d.totalRiskScore / d.employees) : 0,
    highRiskCount:   d.high,
    mediumRiskCount: d.medium,
    lowRiskCount:    d.low,
  })).sort((a, b) => b.avgRiskScore - a.avgRiskScore);
}

export async function computeUserAnalytics(userId: string, companyId?: string) {
  const user = await User.findById(userId).select('-passwordHash').lean();
  if (!user) return null;

  const campaignIds = await getCampaignIdsForCompany(companyId || user.companyId?.toString());

  const results = await SimulationResult.find({
    userId,
    campaignId: { $in: campaignIds },
  })
    .populate('campaignId', 'campaignName type')
    .sort({ createdAt: -1 })
    .lean();

  const total       = results.length;
  const clicks      = results.filter(r => r.smsLinkClicked || r.linkClicked).length;
  const credentials = results.filter(r => r.credentialsSubmitted).length;
  const reports     = results.filter(r => r.reportedPhishing || r.voiceReported).length;

  // Use rate-based formula for display — consistent with stored riskScore
  const riskScore = calculateRiskScore(clicks, credentials, reports, total);
  const riskLevel = getRiskLevel(riskScore);

  // Sync to DB if calculation differs from stored value
  if (user.riskScore !== riskScore) {
    await User.findByIdAndUpdate(userId, { riskScore, riskLevel });
  }

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  let rank: number | null = null;
  let percentile: number | null = null;
  if (user.companyId) {
    const [higher, totalInCo] = await Promise.all([
      User.countDocuments({ companyId: user.companyId, points: { $gt: user.points ?? 0 }, role: 'employee' }),
      User.countDocuments({ companyId: user.companyId, role: 'employee' }),
    ]);
    rank       = higher + 1;
    percentile = totalInCo > 0 ? Math.round(((totalInCo - rank + 1) / totalInCo) * 100) : 0;
  }

  const history = results.slice(0, 20).map(r => {
    const campaign = r.campaignId as any;
    let action = 'received';
    if (r.credentialsSubmitted)                       action = 'compromised';
    else if (r.smsLinkClicked || r.linkClicked)       action = 'clicked';
    else if (r.reportedPhishing || r.voiceReported)   action = 'reported';
    else if (r.voiceEngaged || r.voiceVerified)       action = 'engaged';
    return {
      date:         r.smsSentAt || r.callInitiatedAt || r.createdAt,
      campaignName: campaign?.campaignName ?? 'Unknown',
      type:         r.simulationType || campaign?.type || 'unknown',
      action,
      pointsEarned: action === 'reported' ? 10 : action === 'clicked' ? -20 : action === 'compromised' ? -40 : 0,
    };
  });

  return {
    user: {
      id: user._id, name: user.name, email: user.email,
      points: user.points ?? 0, badge: user.badge ?? 'Rookie',
      riskScore, riskLevel, department: user.department,
    },
    stats: {
      totalSimulations: total, clicks, credentials, reports,
      ignored:          Math.max(0, total - clicks - reports),
      clickRate:        pct(clicks),
      reportRate:       pct(reports),
      compromiseRate:   pct(credentials),
      safeRate:         pct(Math.max(0, total - clicks - credentials)),
    },
    ranking: { rank, percentile },
    history,
  };
}