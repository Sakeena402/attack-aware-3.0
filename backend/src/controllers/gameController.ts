import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Game } from '../models/Game.js';
import { UserGame } from '../models/UserGame.js';
import { updateUserPoints } from '../services/analyticsService.js';
import { completeLinkedTasks } from '../services/taskService.js';
import { awardMonthlyPoints } from '../services/pointsGuard.js';
import { getOpenCounts } from '../services/contentAccessService.js';
import { AppError } from '../utils/errorHandler.js';

import { Company } from '../models/Company.js';

export const getGames = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const games = await Game.find();

    let isUnlocked = req.user?.role === 'super_admin' || req.user?.role === 'admin';

    if (!isUnlocked && req.user?.companyId) {
      const company = await Company.findById(req.user.companyId).populate('subscriptionPlan');
      if (company?.subscriptionPlan && company.approvalStatus === 'approved') {
        isUnlocked = true;
      }
    }

    // Not unlocked through a company plan: open the first N games (N depends on the plan)
    const open = isUnlocked ? null : await getOpenCounts(req.user);

    const withLockStatus = games.map((g, index) => ({
      ...g.toObject(),
      isLocked: open ? index >= open.games : false,
    }));

    res.json({ success: true, data: withLockStatus });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const getGameById = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      res.status(404).json({ success: false, error: 'Game not found' });
      return;
    }
     res.json({ success: true, data: game });
  } catch (e: any) {
    res.status(404).json({ success: false, error: 'Game not found' });
  }
};

export const createGame = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const game = await Game.create(req.body);
    res.status(201).json({ success: true, data: game });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const saveScore = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const gameId = req.params.id;
    const userId = req.user?.id;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { score } = req.body;
    const game = await Game.findById(gameId);
    if (!game) throw new AppError('Game not found', 404);

    const userGame = await UserGame.create({
      userId,
      gameId,
      score,
      playedAt: new Date(),
      companyId: req.user?.companyId
    });

    // Points only the first time per month for each of the two awards
    const playPoints = await awardMonthlyPoints(userId, 'game', gameId, () =>
      updateUserPoints(userId, 'game_played')
    );

    let highScorePoints = false;
    if (score >= game.maxScore * 0.8) {
      highScorePoints = await awardMonthlyPoints(userId, 'game_high_score', gameId, () =>
        updateUserPoints(userId, 'game_high_score')
      );
    }

    await completeLinkedTasks(userId, 'game', gameId);

    res.json({
      success: true,
      data: userGame,
      ...(playPoints || highScorePoints
        ? {}
        : { message: 'Already played this month, so no extra points were awarded.' }),
    });

  } catch (error: any) {
     res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};