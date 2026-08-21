import { Response } from 'express';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CreateCompanyBody, UpdateCompanyBody } from '../types/index.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';

// ============================================
// SELF-SERVICE FLOW: Individual creates their own company and becomes admin
// ============================================
// ============================================
// SELF-SERVICE FLOW: Individual creates their own company and becomes admin
// ============================================

const COOKIE_OPTS_ACCESS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 1000, // 1 hour
};

const COOKIE_OPTS_REFRESH = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

export const createCompanySelfService = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    // Only individual role can use this endpoint
    if (req.user.role !== 'individual') {
      throw new AppError('This endpoint is for individual users only', 403);
    }

    const { companyName, industry } = req.body as CreateCompanyBody;

    if (!companyName || !industry) {
      throw new AppError('Company name and industry are required', 400);
    }

    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) {
      throw new AppError('Company already exists', 409);
    }

    // Check if user already belongs to a company
    if (req.user.companyId) {
      throw new AppError('You already belong to a company', 400);
    }

    // Create company with the calling user as admin (approvalStatus defaults to 'pending')
    const newCompany = new Company({
      companyName,
      industry,
      adminId: req.user.id, // Self-service: caller becomes the admin
    });

    await newCompany.save();

    // Update the calling user: change role to admin and set companyId
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      {
        companyId: newCompany._id,
        role: 'admin',
      },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      throw new AppError('Failed to update user after company creation', 500);
    }

    // 🔑 CRITICAL FIX: Generate new JWT tokens with updated role and companyId
    // The old tokens still have role='individual' and companyId=null
    const newAccessToken = generateToken(
      updatedUser._id.toString(), 
      updatedUser.email, 
      updatedUser.role, // Now 'admin'
      updatedUser.companyId?.toString() // Now newCompany._id
    );
    
    const newRefreshToken = generateRefreshToken(
      updatedUser._id.toString(), 
      updatedUser.email, 
      updatedUser.role, // Now 'admin'
      updatedUser.companyId?.toString() // Now newCompany._id
    );

    // Set new cookies with updated user data
    res.cookie('accessToken', newAccessToken, COOKIE_OPTS_ACCESS);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS_REFRESH);

    res.status(201).json({
      success: true,
      data: {
        company: {
          id: newCompany._id,
          companyName: newCompany.companyName,
          industry: newCompany.industry,
          adminId: newCompany.adminId,
          approvalStatus: newCompany.approvalStatus,
        },
        user: buildUserPayload(updatedUser), // Return updated user data
        message: 'Company created successfully. Approval is pending.',
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create company' });
    }
  }
};

// ============================================
// SUPER-ADMIN FLOW: Create company on behalf of someone else (or with no admin)
// ============================================
export const createCompany = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    // Only super_admin can use this endpoint
    if (req.user.role !== 'super_admin') {
      throw new AppError('Access denied. Super admin role required.', 403);
    }

    // adminId is optional — super_admin creates companies on behalf of others.
    // NEVER use req.user.id here: that would demote/reassign the calling super_admin.
    const { companyName, industry, adminId } = req.body as CreateCompanyBody & { adminId?: string };

    if (!companyName || !industry) {
      throw new AppError('Company name and industry are required', 400);
    }

    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) {
      throw new AppError('Company already exists', 409);
    }

    // If an adminId was provided, verify the target user exists before assigning them.
    let resolvedAdminId: string | undefined;
    if (adminId) {
      const targetUser = await User.findById(adminId).select('_id role').lean();
      if (!targetUser) {
        throw new AppError('Specified admin user not found', 404);
      }
      resolvedAdminId = adminId;
    }

    const newCompany = new Company({
      companyName,
      industry,
      // adminId is undefined when not provided — company is created without an admin
      // and one can be assigned later via updateCompany.
      ...(resolvedAdminId ? { adminId: resolvedAdminId } : {}),
    });

    await newCompany.save();

    // Only update the target user's role and companyId — NEVER touch req.user.
    if (resolvedAdminId) {
      await User.findByIdAndUpdate(resolvedAdminId, {
        companyId: newCompany._id,
        role: 'admin',
      });
    }

    res.status(201).json({
      success: true,
      data: {
        company: {
          id: newCompany._id,
          companyName: newCompany.companyName,
          industry: newCompany.industry,
          adminId: newCompany.adminId ?? null,
          approvalStatus: newCompany.approvalStatus,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create company' });
    }
  }
};

export const getCompany = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id).populate('adminId', 'name email');
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch company' });
    }
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
      id,
      { companyName, industry },
      { new: true, runValidators: true }
    );

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update company' });
    }
  }
};

export const getAllCompanies = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { approvalStatus } = req.query as { approvalStatus?: string };
    
    // Build filter - allow filtering by approval status
    const filter: Record<string, unknown> = {};
    if (approvalStatus && ['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      filter.approvalStatus = approvalStatus;
    }

    const companies = await Company.find(filter).populate('adminId', 'name email').lean();

    res.json({
      success: true,
      data: {
        companies,
        total: companies.length,
        filter: approvalStatus ? { approvalStatus } : null,
      },
    });
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
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    res.json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete company' });
    }
  }
};
