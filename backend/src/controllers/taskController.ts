import { Response } from 'express';
import { Model } from 'mongoose';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Task } from '../models/Task.js';
import { Video } from '../models/Video.js';
import { Quiz } from '../models/Quiz.js';
import { Game } from '../models/Game.js';

const getContentModel = (type: string): Model<any> | null => {
  if (type === 'video') return Video;
  if (type === 'quiz') return Quiz;
  if (type === 'game') return Game;
  return null;
};

export const getTasks = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const role = req.user?.role;
    const query: any = {};
    if (req.user?.companyId) query.companyId = req.user.companyId;

    if (role === 'admin' || role === 'super_admin') {
      query.assignedBy = req.user?.id;
    } else {
      query.assignedTo = req.user?.id;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const tasksWithContent = await Promise.all(
      tasks.map(async (task: any) => {
        const ContentModel = getContentModel(task.contentType);
        let content = null;
        if (ContentModel) {
          content = await ContentModel.findById(task.contentId).lean();
        }
        return { ...task, content };
      })
    );

    res.json({ success: true, data: tasksWithContent });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const createTask = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { title, description, assignedTo, dueDate, contentType, contentId, points } = req.body;

    if (!contentType || !contentId) {
      res.status(400).json({ success: false, error: 'contentType and contentId are required' });
      return;
    }

    const ContentModel = getContentModel(contentType);
    if (!ContentModel) {
      res.status(400).json({ success: false, error: 'Invalid contentType' });
      return;
    }

    const contentExists = await ContentModel.findById(contentId);
    if (!contentExists) {
      res.status(404).json({ success: false, error: 'Selected content not found' });
      return;
    }

    const task = await Task.create({
      title,
      description,
      assignedTo,
      contentType,
      contentId,
      points: points || 10,
      dueDate,
      assignedBy: req.user?.id,
      companyId: req.user?.companyId,
    });

    const populated = await task.populate('assignedTo', 'name email');
    res.status(201).json({ success: true, data: populated });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const updateTaskStatus = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    const task = await Task.findOne({ _id: id, assignedTo: req.user?.id });
    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    task.status = status;
    if (status === 'completed') task.completedAt = new Date();
    await task.save();

    res.json({ success: true, data: task });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};