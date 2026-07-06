import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { ForumPost } from '../models/ForumPost.js';
import { ForumComment } from '../models/ForumComment.js';

export const getPosts = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const posts = await ForumPost.find();
    res.json({ success: true, data: posts });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createPost = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const post = await ForumPost.create({ ...req.body, userId: req.user?.id, companyId: req.user?.companyId });
    res.status(201).json({ success: true, data: post });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getComments = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const comments = await ForumComment.find({ postId: req.params.id });
    res.json({ success: true, data: comments });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createComment = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const comment = await ForumComment.create({ ...req.body, postId: req.params.id, userId: req.user?.id });
    res.status(201).json({ success: true, data: comment });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
