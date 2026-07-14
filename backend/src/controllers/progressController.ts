import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { UserVideo } from '../models/UserVideo.js';
import { UserQuiz } from '../models/UserQuiz.js';
import { UserGame } from '../models/UserGame.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errorHandler.js';

export const getProgress = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401);

    const user = await User.findById(userId).select('points badges riskScore riskLevel').lean();
    if (!user) throw new AppError('User not found', 404);

    const videos = await UserVideo.find({ userId }).populate('videoId', 'title category language').lean();
    const quizzes = await UserQuiz.find({ userId }).populate('quizId', 'title category difficulty').lean();
    const games = await UserGame.find({ userId }).populate('gameId', 'name category maxScore').lean();

    res.json({
      success: true,
      data: {
        points: user.points,
        badge: user.badges?.[0] || 'Rookie',
        riskScore: user.riskScore,
        riskLevel: user.riskLevel,
        videosCompleted: videos.filter(v => v.status === 'Completed').length,
        quizzesTaken: quizzes.length,
        gamesPlayed: games.length,
        history: { videos, quizzes, games }
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Error fetching progress' });
  }
};
