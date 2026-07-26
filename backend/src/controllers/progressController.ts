import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { UserGame } from '../models/UserGame.js';
import { UserQuiz } from '../models/UserQuiz.js';
import { UserVideo } from '../models/UserVideo.js';
import { Game } from '../models/Game.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';

export const getMyProgress = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId)
      .select('points badge riskScore riskLevel')
      .lean() as any;

    // Games
    const gameAttempts = await UserGame.find({ userId }).sort({ playedAt: -1 }).lean();
    const gameIds = [...new Set(gameAttempts.map(g => String(g.gameId)))];
    const games = await Game.find({ _id: { $in: gameIds } }).lean();
    const gameMap = new Map(games.map(g => [String(g._id), g]));
    const gameHistory = gameAttempts
      .filter(a => gameMap.has(String(a.gameId)))
      .map(a => ({
        game_title: gameMap.get(String(a.gameId))!.name,
        score: a.score,
        played_at: a.playedAt,
      }));

    // Quizzes
    const quizAttempts = await UserQuiz.find({ userId }).sort({ completedAt: -1 }).lean();
    const quizIds = [...new Set(quizAttempts.map(q => String(q.quizId)))];
    const quizzes = await Quiz.find({ _id: { $in: quizIds } }).lean();
    const quizMap = new Map(quizzes.map(q => [String(q._id), q]));
    const quizHistory = quizAttempts
      .filter(a => quizMap.has(String(a.quizId)))
      .map(a => ({
        quiz_title: quizMap.get(String(a.quizId))!.title,
        score: a.score,
        attempted_at: a.completedAt,
      }));

    // Videos
    const videoAttempts = await UserVideo.find({ userId }).sort({ watchedAt: -1 }).lean();
    const videoHistory = videoAttempts.map(v => ({
      video_id: v.videoId,
      status: v.status,
      watched_at: v.watchedAt,
    }));

    res.json({
      success: true,
      data: {
        points: user?.points ?? 0,
        badge: user?.badge ?? 'Rookie',
        riskScore: user?.riskScore ?? 0,
        riskLevel: user?.riskLevel ?? 'low',
        videosCompleted: videoAttempts.filter(v => v.status === 'Completed').length,
        quizzesTaken: quizAttempts.length,
        gamesPlayed: gameAttempts.length,
        history: { games: gameHistory, quizzes: quizHistory, videos: videoHistory },
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};