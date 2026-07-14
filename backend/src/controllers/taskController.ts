import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Task } from '../models/Task.js';

export const getTasks = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const query: any = {};
    if (req.user?.companyId) query.companyId = req.user.companyId;
    const tasks = await Task.find(query);
    res.json({ success: true, data: tasks });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createTask = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const task = await Task.create({ ...req.body, assignedBy: req.user?.id, companyId: req.user?.companyId });
    res.status(201).json({ success: true, data: task });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
