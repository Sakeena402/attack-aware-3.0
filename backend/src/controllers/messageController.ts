import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Message } from '../models/Message.js';

export const getMessages = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const messages = await Message.find({ receiverId: req.user?.id });
    res.json({ success: true, data: messages });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const sendMessage = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const msg = await Message.create({ ...req.body, senderId: req.user?.id, companyId: req.user?.companyId });
    res.status(201).json({ success: true, data: msg });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
