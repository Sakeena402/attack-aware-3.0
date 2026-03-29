import { Router } from 'express';
import {
  createContactMessage,
  getContactMessages,
  markAsRead,
  deleteMessage,
} from '../controllers/contactController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const contactRouter = Router();

contactRouter.post('/', createContactMessage);
contactRouter.get('/', authenticate, authorize('super_admin'), getContactMessages);
contactRouter.patch('/:id', authenticate, authorize('super_admin'), markAsRead);
contactRouter.delete('/:id', authenticate, authorize('super_admin'), deleteMessage);

export default contactRouter;
