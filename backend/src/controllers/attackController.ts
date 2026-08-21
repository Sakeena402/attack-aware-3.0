import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Attack } from '../models/Attack.js';

export const getAttacks = async (_req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const attacks = await Attack.find();
    res.json({ success: true, data: attacks });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createAttack = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const attack = await Attack.create(req.body);
    res.status(201).json({ success: true, data: attack });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
