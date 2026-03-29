import { Response } from 'express';
import { Leaderboard } from '../models/Leaderboard.js';
import { User } from '../models/User.js';
import { SimulationResult } from '../models/SimulationResult.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse } from '../types/index.js';

export const updateLeaderboard = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyId } = req.params;

    const users = await User.find({ companyId, role: 'employee' });

    const leaderboardUpdates = await Promise.all(
      users.map(async (user) => {
        const results = await SimulationResult.find({ userId: user._id, companyId });

        const totalSimulations = results.length;
        const correctResponses = results.filter((r) => r.credentialsSubmitted === false).length;
        const averageScore = totalSimulations > 0 ? (correctResponses / totalSimulations) * 100 : 0;
        const totalScore = results.reduce((sum, r) => sum + (r.credentialsSubmitted ? 0 : 10), 0);

        let badge = 'novice';
        if (averageScore >= 80) badge = 'expert';
        else if (averageScore >= 60) badge = 'aware';

        return Leaderboard.findOneAndUpdate(
          { userId: user._id, companyId },
          {
            score: totalScore,
            totalSimulations,
            correctResponses,
            averageScore: Math.round(averageScore),
            badge,
            department: user.department,
            lastUpdated: new Date(),
          },
          { upsert: true, new: true }
        );
      })
    );

    res.json({
      success: true,
      message: 'Leaderboard updated successfully',
      data: { updated: leaderboardUpdates.length },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update leaderboard' });
    }
  }
};

export const getLeaderboardGeneral = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyId, department, limit = '50' } = req.query as {
      companyId?: string;
      department?: string;
      limit?: string;
    };

    // Build query
    const query: Record<string, unknown> = {};
    if (companyId) {
      query.companyId = companyId;
    } else if (req.user.role !== 'super_admin' && req.user.companyId) {
      query.companyId = req.user.companyId;
    }
    if (department && department !== 'all') {
      query.department = department;
    }

    // Try to get from Leaderboard collection first
    let leaderboard = await Leaderboard.find(query)
      .populate('userId', 'name email department points badge')
      .sort({ score: -1 })
      .limit(Number(limit))
      .lean();

    // If no leaderboard entries, generate from users
    if (leaderboard.length === 0) {
      const users = await User.find(query.companyId ? { companyId: query.companyId } : {})
        .select('name email department points badge')
        .sort({ points: -1 })
        .limit(Number(limit))
        .lean();

      leaderboard = users.map((user, index) => ({
        _id: user._id,
        userId: user._id,
        userName: user.name,
        department: user.department || 'General',
        score: user.points || 0,
        badge: user.badge || 'Rookie',
        rank: index + 1,
        trend: 'stable',
      })) as any;
    } else {
      // Format leaderboard entries
      leaderboard = leaderboard.map((entry, index) => {
        const userData = entry.userId as any;
        return {
          _id: entry._id,
          userId: userData?._id || entry.userId,
          userName: userData?.name || 'Unknown',
          department: entry.department || userData?.department || 'General',
          score: entry.score || 0,
          badge: entry.badge || userData?.badge || 'Rookie',
          rank: index + 1,
          trend: 'stable',
        };
      }) as any;
    }

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
  }
};

export const getLeaderboard = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyId } = req.params;
    const { department } = req.query;

    const query: Record<string, unknown> = { companyId };
    if (department && typeof department === 'string') {
      query.department = department;
    }

    const leaderboard = await Leaderboard.find(query)
      .populate('userId', 'name email department points')
      .sort({ score: -1 })
      .lean();

    // Assign ranks
    const leaderboardWithRanks = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    res.json({
      success: true,
      data: leaderboardWithRanks,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
  }
};

export const getTopPerformers = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { limit = '10' } = req.query;

    const topPerformers = await Leaderboard.find({ companyId })
      .populate('userId', 'name email department')
      .sort({ score: -1 })
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: topPerformers,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch top performers' });
  }
};

export const getDepartmentRanking = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { companyId } = req.params;

    const departments = await Leaderboard.aggregate([
      { $match: { companyId: companyId as any } },
      {
        $group: {
          _id: '$department',
          averageScore: { $avg: '$score' },
          totalEmployees: { $sum: 1 },
        },
      },
      { $sort: { averageScore: -1 } },
    ]);

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch department rankings' });
  }
};
