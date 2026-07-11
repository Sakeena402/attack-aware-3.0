import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getPosts, createPost, getComments, createComment } from '../controllers/forumController.js';

const router = Router();
router.get('/posts', authenticate, getPosts);
router.post('/posts', authenticate, createPost);
router.get('/posts/:id/comments', authenticate, getComments);
router.post('/posts/:id/comments', authenticate, createComment);

export default router;
