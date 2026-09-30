import { Response } from 'express';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CreateCompanyBody, UpdateCompanyBody } from '../types/index.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';

const COOKIE_OPTS_ACCESS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  maxAge: 60 * 60 * 1000,
};

const COOKIE_OPTS_REFRESH = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function buildUserPayload(user: any) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    department: user.department,
    points: user.points,
    badge: user.badge ?? 'Rookie',
  };
}

// ============================================
// SELF-SERVICE: Individual creates their own company and becomes admin
// ============================================
export const createCompanySelfService = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);
    if (req.user.role !== 'individual') {
      throw new AppError('This endpoint is for individual users only', 403);
    }

    const {
      companyName,
      industry,
      companyUrl,
      companyEmail,
      employeeCount,
      contactPerson,
      taxId,
    } = req.body as CreateCompanyBody;

    if (!companyName || !industry) {
      throw new AppError('Company name and industry are required', 400);
    }

    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) throw new AppError('Company already exists', 409);
    if (req.user.companyId) throw new AppError('You already belong to a company', 400);

    const newCompany = new Company({
      companyName,
      industry,
      companyUrl,
      companyEmail,
      employeeCount: typeof employeeCount === 'number' ? employeeCount : 0,
      contactPerson,
      taxId,
      adminId: req.user.id,
    });

    await newCompany.save();

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { companyId: newCompany._id, role: 'admin' },
      { new: true }
    );
    if (!updatedUser) throw new AppError('Failed to update user after company creation', 500);

    const newAccessToken = generateToken(
      updatedUser._id.toString(), updatedUser.email, updatedUser.role, updatedUser.companyId?.toString()
    );
    const newRefreshToken = generateRefreshToken(
      updatedUser._id.toString(), updatedUser.email, updatedUser.role, updatedUser.companyId?.toString()
    );
    res.cookie('accessToken', newAccessToken, COOKIE_OPTS_ACCESS);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS_REFRESH);

    res.status(201).json({
      success: true,
      data: {
        company: newCompany,
        user: buildUserPayload(updatedUser),
        message: 'Company created successfully. Approval is pending.',
      },
    });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ success: false, error: error.message });
    else res.status(500).json({ success: false, error: 'Failed to create company' });
  }
};

// ============================================
// Admin: fetch their own company profile
// ============================================
export const getMyCompany = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    if (!req.user.companyId) {
      throw new AppError('Your account is not associated with a company', 400);
    }

    const company = await Company.findById(req.user.companyId)
      .populate('adminId', 'name email')
      .populate('subscriptionPlan');

    if (!company) throw new AppError('Company not found', 404);

    res.json({ success: true, data: company });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ success: false, error: error.message });
    else res.status(500).json({ success: false, error: 'Failed to fetch company' });
  }
};

// Admin: update their own company's editable fields
export const updateMyCompany = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    if (!req.user.companyId) {
      throw new AppError('Your account is not associated with a company', 400);
    }

    const { companyUrl, companyEmail, employeeCount, contactPerson, taxId } = req.body as UpdateCompanyBody;

    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      { companyUrl, companyEmail, employeeCount, contactPerson, taxId },
      { new: true, runValidators: true }
    );
    if (!company) throw new AppError('Company not found', 404);

    res.json({ success: true, data: company });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ success: false, error: error.message });
    else res.status(500).json({ success: false, error: 'Failed to update company' });
  }
};

// ============================================
// SUPER-ADMIN: create company on behalf of someone else
// ============================================
export const createCompany = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);
    if (req.user.role !== 'super_admin') {
      throw new AppError('Access denied. Super admin role required.', 403);
    }

    const { companyName, industry, adminId } = req.body as CreateCompanyBody & { adminId?: string };
    if (!companyName || !industry) throw new AppError('Company name and industry are required', 400);

    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) throw new AppError('Company already exists', 409);

    let resolvedAdminId: string | undefined;
    if (adminId) {
      const targetUser = await User.findById(adminId).select('_id role').lean();
      if (!targetUser) throw new AppError('Specified admin user not found', 404);
      resolvedAdminId = adminId;
    }

    const newCompany = new Company({
      companyName,
      industry,
      ...(resolvedAdminId ? { adminId: resolvedAdminId } : {}),
    });
    await newCompany.save();

    if (resolvedAdminId) {
      await User.findByIdAndUpdate(resolvedAdminId, { companyId: newCompany._id, role: 'admin' });
    }

    res.status(201).json({ success: true, data: newCompany });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ success: false, error: error.message });
    else res.status(500).json({ success: false, error: 'Failed to create company' });
  }
};

export const getCompany = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const company = await Company.findById(id).populate('adminId', 'name email');
    if (!company) throw new AppError('Company not found', 404);
    res.json({ success: true, data: company });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ success: false, error: error.message });
    else res.status(500).json({ success: false, error: 'Failed to fetch company' });
  }
};

export const updateCompany = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const { companyName, industry } = req.body as UpdateCompanyBody;

    const company = await Company.findByIdAndUpdate(
      id, { companyName, industry }, { new: true, runValidators: true }
    );
    if (!company) throw new AppError('Company not found', 404);
    res.json({ success: true, data: company });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ success: false, error: error.message });
    else res.status(500).json({ success: false, error: 'Failed to update company' });
  }
};

export const updateCompanyApprovalStatus = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body as { approvalStatus?: string };

    if (!approvalStatus || !['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      throw new AppError('approvalStatus must be pending, approved, or rejected', 400);
    }

    const company = await Company.findByIdAndUpdate(
      id, { approvalStatus }, { new: true, runValidators: true }
    );
    if (!company) throw new AppError('Company not found', 404);
    res.json({ success: true, data: company });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ success: false, error: error.message });
    else res.status(500).json({ success: false, error: 'Failed to update approval status' });
  }
};

// Flat array for enterprise-requests/page.tsx
export const getCompaniesForReview = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const companies = await Company.find().populate('adminId', 'name email').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch companies' });
  }
};

export const getAllCompanies = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { approvalStatus } = req.query as { approvalStatus?: string };
    const filter: Record<string, unknown> = {};
    if (approvalStatus && ['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      filter.approvalStatus = approvalStatus;
    }
    const companies = await Company.find(filter).populate('adminId', 'name email').lean();
    res.json({ success: true, data: { companies, total: companies.length, filter: approvalStatus ? { approvalStatus } : null } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch companies' });
  }
};

export const deleteCompany = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const company = await Company.findByIdAndDelete(id);
    if (!company) throw new AppError('Company not found', 404);
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ success: false, error: error.message });
    else res.status(500).json({ success: false, error: 'Failed to delete company' });
  }
};