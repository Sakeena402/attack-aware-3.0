import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { AppError, ErrorCodes } from '../utils/errorHandler.js';

// Validation target types
type ValidationTarget = 'body' | 'query' | 'params';

// Validation middleware factory
export const validate = <T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body'
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[target];
      const parsed = schema.parse(dataToValidate);
      
      // Replace with parsed/transformed data
      if (target === 'body') {
        req.body = parsed;
      } else if (target === 'query') {
        req.query = parsed as typeof req.query;
      } else if (target === 'params') {
        req.params = parsed as typeof req.params;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        throw new AppError(
          'Validation failed',
          400,
          ErrorCodes.VALIDATION_ERROR,
          { errors: formattedErrors }
        );
      }
      next(error);
    }
  };
};

// Validate multiple targets at once
export const validateMultiple = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: { target: string; field: string; message: string }[] = [];
    
    for (const [target, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      
      try {
        const dataToValidate = req[target as ValidationTarget];
        const parsed = schema.parse(dataToValidate);
        
        if (target === 'body') {
          req.body = parsed;
        } else if (target === 'query') {
          req.query = parsed as typeof req.query;
        } else if (target === 'params') {
          req.params = parsed as typeof req.params;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          error.errors.forEach((err) => {
            errors.push({
              target,
              field: err.path.join('.'),
              message: err.message,
            });
          });
        }
      }
    }
    
    if (errors.length > 0) {
      throw new AppError(
        'Validation failed',
        400,
        ErrorCodes.VALIDATION_ERROR,
        { errors }
      );
    }
    
    next();
  };
};

// ============================================
// Common Validation Schemas
// ============================================

// Shared field schemas
export const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
export const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

// Auth Schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['employee', 'admin', 'super_admin']).optional().default('employee'),
  department: z.string().optional(),
  companyId: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Employee Schemas
export const createEmployeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: emailSchema,
  password: passwordSchema,
  department: z.string().optional(),
  role: z.enum(['employee', 'admin', 'super_admin']).optional().default('employee'),
  riskLevel: z.enum(['low', 'medium', 'high']).optional().default('low'),
  companyId: z.string().optional(),
  phone: phoneSchema.optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  department: z.string().optional(),
  role: z.enum(['employee', 'admin', 'super_admin']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  phone: phoneSchema.optional(),
  points: z.number().min(0).optional(),
  badge: z.string().optional(),
});

// Campaign Schemas
export const createCampaignSchema = z.object({
  campaignName: z.string().min(3, 'Campaign name must be at least 3 characters').max(200).trim(),
  type: z.enum(['phishing', 'smishing', 'vishing']),
  description: z.string().max(1000).optional(),
  targetDepartments: z.array(z.string()).optional(),
  targetEmployees: z.array(mongoIdSchema).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  emailTemplate: z.string().optional(),
  smsTemplate: z.string().optional(),
  voiceScript: z.string().optional(),
  companyId: z.string().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

// Simulation Schemas
export const sendSmsSchema = z.object({
  campaignId: mongoIdSchema,
  userId: mongoIdSchema,
  templateKey: z.string().min(1, 'Template key is required'),
});

export const launchSmsCampaignSchema = z.object({
  templateKey: z.string().min(1, 'Template key is required'),
  targetDepartment: z.string().optional(),
});

export const makeCallSchema = z.object({
  campaignId: mongoIdSchema,
  userId: mongoIdSchema,
  scriptKey: z.string().min(1, 'Script key is required'),
});

export const launchVoiceCampaignSchema = z.object({
  scriptKey: z.string().min(1, 'Script key is required'),
  targetDepartment: z.string().optional(),
});

// Contact Schema
export const contactSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100).trim(),
  email: emailSchema,
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000).trim(),
  company: z.string().max(200).optional(),
  phone: phoneSchema.optional(),
});

// Company Schema
export const companySchema = z.object({
  companyName: z.string().min(2, 'Company name is required').max(200).trim(),
  industry: z.string().min(2, 'Industry is required').max(100).trim(),
  adminId: mongoIdSchema.optional(),
});

// Query Params Schemas
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const employeeQuerySchema = paginationSchema.extend({
  department: z.string().optional(),
  role: z.enum(['employee', 'admin', 'super_admin']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  search: z.string().optional(),
  companyId: z.string().optional(),
});

export const campaignQuerySchema = paginationSchema.extend({
  status: z.enum(['draft', 'active', 'completed', 'paused']).optional(),
  type: z.enum(['phishing', 'smishing', 'vishing']).optional(),
  companyId: z.string().optional(),
});

export const leaderboardQuerySchema = z.object({
  companyId: z.string().optional(),
  department: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50'),
});

// ID Param Schema
export const idParamSchema = z.object({
  id: mongoIdSchema,
});

// Tracking Schemas
export const trackingClickSchema = z.object({
  t: z.string().min(1, 'Token is required'), // tracking token
  c: mongoIdSchema.optional(), // campaign ID
  u: mongoIdSchema.optional(), // user ID
  p: z.string().optional(), // page type
});

export const trackingSubmitSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  action: z.enum(['submit', 'report']),
  data: z.record(z.unknown()).optional(),
});

// Webhook Schemas
export const twilioSmsWebhookSchema = z.object({
  MessageSid: z.string(),
  MessageStatus: z.string(),
  To: z.string().optional(),
  From: z.string().optional(),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
});

export const twilioVoiceWebhookSchema = z.object({
  CallSid: z.string(),
  CallStatus: z.string(),
  Digits: z.string().optional(),
  To: z.string().optional(),
  From: z.string().optional(),
  CallDuration: z.string().optional(),
});

// Type exports for use in controllers
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CompanyInput = z.infer<typeof companySchema>;

export default {
  validate,
  validateMultiple,
  // Auth
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  // Employee
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
  // Campaign
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema,
  // Simulation
  sendSmsSchema,
  launchSmsCampaignSchema,
  makeCallSchema,
  launchVoiceCampaignSchema,
  // Other
  contactSchema,
  companySchema,
  idParamSchema,
  paginationSchema,
  leaderboardQuerySchema,
  // Tracking
  trackingClickSchema,
  trackingSubmitSchema,
  // Webhooks
  twilioSmsWebhookSchema,
  twilioVoiceWebhookSchema,
};
