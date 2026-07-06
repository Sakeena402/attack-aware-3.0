import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Video } from '../models/Video.js';
import { UserVideo } from '../models/UserVideo.js';
import { updateUserPoints } from '../services/analyticsService.js';
import { AppError } from '../utils/errorHandler.js';

export const getVideos = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const videos = await Video.find();
    res.json({ success: true, data: videos });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const createVideo = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const video = await Video.create(req.body);
    res.status(201).json({ success: true, data: video });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const watchVideo = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const videoId = req.params.id;
    const userId = req.user?.id;
    if (!userId) throw new AppError('Unauthorized', 401);

    const userVideo = await UserVideo.findOneAndUpdate(
      { userId, videoId },
      { status: 'Completed', watchedAt: new Date(), companyId: req.user?.companyId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await updateUserPoints(userId, 'video_completed');

    res.json({ success: true, data: userVideo });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};
