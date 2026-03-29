import { Schema, model } from 'mongoose';
import { IContactMessage } from '../types/index.js';

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

contactMessageSchema.index({ email: 1 });
contactMessageSchema.index({ createdAt: -1 });

export const ContactMessage = model<IContactMessage>(
  'ContactMessage',
  contactMessageSchema
);
