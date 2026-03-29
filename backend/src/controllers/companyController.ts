import { Response } from 'express';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CreateCompanyBody, UpdateCompanyBody } from '../types/index.js';

export const createCompany = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyName, industry } = req.body as CreateCompanyBody;

    if (!companyName || !industry) {
      throw new AppError('Company name and industry are required', 400);
    }

    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) {
      throw new AppError('Company already exists', 409);
    }

    const newCompany = new Company({
      companyName,
      industry,
      adminId: req.user.id,
    });

    await newCompany.save();

    await User.findByIdAndUpdate(req.user.id, {
      companyId: newCompany._id,
      role: 'admin',
    });

    res.status(201).json({
      success: true,
      data: {
        company: {
          id: newCompany._id,
          companyName: newCompany.companyName,
          industry: newCompany.industry,
          adminId: newCompany.adminId,
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
    const companies = await Company.find().populate('adminId', 'name email').lean();

    res.json({
      success: true,
      data: {
        companies,
        total: companies.length,
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
