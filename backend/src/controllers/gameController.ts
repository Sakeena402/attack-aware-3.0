import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Game } from '../models/Game.js';
import { UserGame } from '../models/UserGame.js';
import { updateUserPoints } from '../services/analyticsService.js';
import { completeLinkedTasks } from '../services/taskService.js';
import { AppError } from '../utils/errorHandler.js';

export const getGames = async (_req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const games = await Game.find();
    res.json({ success: true, data: games });
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

    await updateUserPoints(userId, 'game_played');

    if (score >= game.maxScore * 0.8) {
      await updateUserPoints(userId, 'game_high_score');
    }

    await completeLinkedTasks(userId, 'game', gameId);

    res.json({ success: true, data: userGame });

  } catch (error: any) {
     res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};