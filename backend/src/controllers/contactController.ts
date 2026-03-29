import { Response } from 'express';
import { ContactMessage } from '../models/ContactMessage.js';
import { validateEmail } from '../utils/validators.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CreateContactBody } from '../types/index.js';

export const createContactMessage = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { name, email, company, subject, message } = req.body as CreateContactBody;

    if (!name || !email || !subject || !message) {
      throw new AppError('All required fields must be provided', 400);
    }

    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400);
    }

    if (message.length > 1000) {
      throw new AppError('Message cannot exceed 1000 characters', 400);
    }

    const newMessage = new ContactMessage({
      name,
      email,
      company,
      subject,
      message,
      isRead: false,
    });

    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  }
};

export const getContactMessages = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const messages = await ContactMessage.find().sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      data: {
        messages,
        total: messages.length,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
  }
};

export const markAsRead = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    const message = await ContactMessage.findByIdAndUpdate(id, { isRead: true }, { new: true });

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update message' });
    }
  }
};

export const deleteMessage = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    const message = await ContactMessage.findByIdAndDelete(id);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete message' });
    }
  }
};
