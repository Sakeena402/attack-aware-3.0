// backend/src/controllers/employeeController.ts

import { Response } from 'express';
import bcryptjs from 'bcryptjs';
import * as XLSX from 'xlsx';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import {
  generateCompanyEmail,
  generateRandomPassword,
  generatePasswordSetupToken,
} from '../utils/generateCredentials.js';
import { sendEmployeeSetupEmail } from '../services/emailService.js';

import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse } from '../types/index.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getAllEmployees = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const { department, search, limit = '50', page = '1' } = req.query as {
      department?: string;
      search?: string;
      limit?: string;
      page?: string;
    };

    // companyFilter is set by isolateByCompany — never trust companyId from the client
    const companyFilter = (req as any).companyFilter || {};
    const query: Record<string, unknown> = { ...companyFilter };

    if (department) query.department = department;

    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip     = (pageNum - 1) * limitNum;

    const [employees, total] = await Promise.all([
      User.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        employees: employees.map(emp => ({ ...emp, id: emp._id })),
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    if (error instanceof AppError) res.status(error.statusCode).json({ success: false, error: error.message });
    else res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
};

export const getEmployeeById = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    const employee = await User.findById(id).select('-passwordHash').lean();

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Check if user has access to this employee
    if (req.user.role !== 'super_admin' && req.user.companyId !== employee.companyId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch employee' });
    }
  }
};

export const createEmployee = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { name, department, role = 'employee', phoneNumber, personalEmail } = req.body;
    // NOTE: the company login email and the placeholder password are both
    // auto-generated below. The employee's PERSONAL email is what the setup
    // link is delivered to.
    const bodyCompanyId = req.body.companyId;

    if (!name || !String(name).trim()) {
      throw new AppError('Name is required', 400);
    }
    const trimmedName = String(name).trim();
    const trimmedPhone = (phoneNumber || '').toString().trim();

    const trimmedPersonalEmail = (personalEmail || '').toString().trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedPersonalEmail)) {
      throw new AppError('A valid personal email is required so the setup link can be delivered', 400);
    }

    // Determine company ID — non-super_admin is always locked to their own companyId
    const employeeCompanyId = req.user.role === 'super_admin'
      ? (bodyCompanyId || req.user.companyId)
      : req.user.companyId;

    if (!employeeCompanyId) {
      throw new AppError('Company ID is required', 400);
    }

    // Single company fetch, reused for approval check, plan check, and the email domain
    const company = await Company.findById(employeeCompanyId).populate('subscriptionPlan').lean();
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // ── Company approval status check: admin must have approved company ──────────
    if (req.user.role !== 'super_admin' && company.approvalStatus !== 'approved') {
      throw new AppError(
        'Your company is pending approval. You cannot add employees yet. Please contact support.',
        403
      );
    }
    // ──────────────────────────────────────────────────────────────────────────

    // ── Plan enforcement: check maxEmployees limit ──────────────────────────
    if (company.subscriptionPlan) {
      const plan = company.subscriptionPlan as any;
      if (typeof plan.maxEmployees === 'number') {
        const currentCount = await User.countDocuments({
          companyId: employeeCompanyId,
          role: 'employee',
        });
        if (currentCount >= plan.maxEmployees) {
          throw new AppError(
            `Employee limit reached for your current plan (max ${plan.maxEmployees}). Please upgrade your plan to add more employees.`,
            403
          );
        }
      }
      // No subscriptionPlan set → skip the check (don't block on missing plan)
    }
    // ──────────────────────────────────────────────────────────────────────────

    // ── Duplicate check: same personal email, OR same name + same phone ────────
    const duplicate = await User.findOne({
      companyId: employeeCompanyId,
      $or: [
        { personalEmail: trimmedPersonalEmail },
        {
          name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
          phoneNumber: trimmedPhone ? trimmedPhone : { $in: ['', null] },
        },
      ],
    }).lean();

    if (duplicate) {
      throw new AppError(
        'This employee already exists in your company (same personal email, or same name and phone number).',
        409
      );
    }
    // ──────────────────────────────────────────────────────────────────────────

    // ── Auto-generate company email + placeholder password + setup token ────────
    const generatedEmail = await generateCompanyEmail(trimmedName, company.companyName);
    const placeholderPassword = generateRandomPassword();
    const passwordHash = await bcryptjs.hash(placeholderPassword, 10);
    const { token: setupToken, hashedToken, expires } = generatePasswordSetupToken();
    // ──────────────────────────────────────────────────────────────────────────

    const newEmployee = new User({
      name: trimmedName,
      email: generatedEmail,
      personalEmail: trimmedPersonalEmail,
      passwordHash,
      department: department || 'General',
      role,
      companyId: employeeCompanyId,
      points: 0,
      badge: 'Rookie',
      phoneNumber: trimmedPhone,
      isPasswordSet: false,
      passwordSetupToken: hashedToken,
      passwordSetupTokenExpires: expires,
      createdByAdmin: req.user.id,
    });

    await newEmployee.save();

    // Send the setup email to the PERSONAL inbox. If it fails, roll back the
    // employee so no half-created account is left behind.
    try {
      await sendEmployeeSetupEmail({
        to: trimmedPersonalEmail,
        loginEmail: generatedEmail,
        name: trimmedName,
        companyName: company.companyName,
        rawToken: setupToken,
      });
    } catch (emailError: any) {
      console.error('SETUP EMAIL ERROR:', emailError);
      await User.findByIdAndDelete(newEmployee._id);
      throw new AppError(
        'Employee was not created because the setup email could not be sent. Please check the email configuration and try again.',
        502
      );
    }

    const employeeResponse = newEmployee.toObject();
    delete (employeeResponse as any).passwordHash;
    delete (employeeResponse as any).passwordSetupToken;

    res.status(201).json({
      success: true,
      data: employeeResponse,
    });
  } catch (error) {
    console.error('CREATE EMPLOYEE ERROR:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create employee' });
    }
  }
};
// --- Bulk employee creation from an uploaded Excel sheet ---

// Maps expected DB fields to the possible column header names a sheet might use.
// Headers are normalized (lowercased, punctuation stripped) before matching.
const FIELD_ALIASES: Record<string, string[]> = {
  name: ['name', 'fullname', 'full name', 'employee name', 'employeename'],
  department: ['department', 'dept'],
  phoneNumber: ['phone', 'phonenumber', 'phone number', 'mobile', 'mobile number', 'contact', 'contact number'],
  role: ['role', 'designation', 'position'],
  personalEmail: ['email', 'email address', 'e mail', 'personal email', 'personalemail', 'mail'],
};

function normalizeHeader(header: string): string {
  return header
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Builds a { originalHeader -> dbField } map, and returns which original headers had no match.
function buildColumnMap(headers: string[]): { columnMap: Record<string, string>; unmatched: string[] } {
  const columnMap: Record<string, string> = {};
  const unmatched: string[] = [];

  for (const rawHeader of headers) {
    const normalized = normalizeHeader(rawHeader);
    const matchedField = Object.entries(FIELD_ALIASES).find(([, aliases]) =>
      aliases.includes(normalized)
    )?.[0];

    if (matchedField) {
      columnMap[rawHeader] = matchedField;
    } else {
      unmatched.push(rawHeader);
    }
  }

  return { columnMap, unmatched };
}

export const createEmployeesBulk = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw new AppError('No file uploaded. Attach an Excel file under field "file"', 400);

    const bodyCompanyId = req.body.companyId;
    const employeeCompanyId = req.user.role === 'super_admin'
      ? (bodyCompanyId || req.user.companyId)
      : req.user.companyId;

    if (!employeeCompanyId) {
      throw new AppError('Company ID is required', 400);
    }

    const company = await Company.findById(employeeCompanyId).populate('subscriptionPlan').lean();
    if (!company) throw new AppError('Company not found', 404);

    if (req.user.role !== 'super_admin' && company.approvalStatus !== 'approved') {
      throw new AppError(
        'Your company is pending approval. You cannot add employees yet. Please contact support.',
        403
      );
    }

    // ── Parse the Excel file ──────────────────────────────────────────────────
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new AppError('Uploaded file has no sheets', 400);

    const sheet = workbook.Sheets[firstSheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      throw new AppError('Uploaded sheet has no data rows', 400);
    }

    const headers = Object.keys(rows[0]);
    const { columnMap, unmatched } = buildColumnMap(headers);

    if (!Object.values(columnMap).includes('name')) {
      throw new AppError(
        'Could not find a "Name" column in the sheet. Please add a column titled Name (or Full Name).',
        400
      );
    }
    if (!Object.values(columnMap).includes('personalEmail')) {
      throw new AppError(
        'Could not find an "Email" column in the sheet. Each employee needs a personal email so the setup link can be delivered.',
        400
      );
    }
    // ──────────────────────────────────────────────────────────────────────────

    // ── Plan enforcement: check maxEmployees limit against the whole batch ─────
    if (company.subscriptionPlan) {
      const plan = company.subscriptionPlan as any;
      if (typeof plan.maxEmployees === 'number') {
        const currentCount = await User.countDocuments({
          companyId: employeeCompanyId,
          role: 'employee',
        });
        if (currentCount + rows.length > plan.maxEmployees) {
          throw new AppError(
            `This upload would exceed your plan's employee limit (max ${plan.maxEmployees}, currently ${currentCount}, trying to add ${rows.length}). Please upgrade your plan.`,
            403
          );
        }
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const created: { name: string; email: string }[] = [];
    const skipped: { row: number; reason: string }[] = [];
    const seenInSheet = new Set<string>(); // catches duplicate emails within the same file

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNumber = i + 2; // +2 = header row + 1-indexing

      // Rebuild the row using matched DB field names only
      const mappedRow: Record<string, any> = {};
      for (const [originalHeader, dbField] of Object.entries(columnMap)) {
        mappedRow[dbField] = rawRow[originalHeader];
      }

      const name = (mappedRow.name || '').toString().trim();
      if (!name) {
        skipped.push({ row: rowNumber, reason: 'Missing name' });
        continue;
      }

      const personalEmail = (mappedRow.personalEmail || '').toString().trim().toLowerCase();
      if (!EMAIL_REGEX.test(personalEmail)) {
        skipped.push({ row: rowNumber, reason: 'Missing or invalid email' });
        continue;
      }

      const phone = mappedRow.phoneNumber ? mappedRow.phoneNumber.toString().trim() : '';

      // ── Duplicate check — inside this sheet (same personal email) ───────────
      if (seenInSheet.has(personalEmail)) {
        skipped.push({ row: rowNumber, reason: `Duplicate email "${personalEmail}" appears earlier in this sheet` });
        continue;
      }
      seenInSheet.add(personalEmail);

      // ── Duplicate check — already in the company (same email, or same name + phone) ──
      const existing = await User.findOne({
        companyId: employeeCompanyId,
        $or: [
          { personalEmail },
          {
            name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
            phoneNumber: phone ? phone : { $in: ['', null] },
          },
        ],
      }).lean();

      if (existing) {
        skipped.push({ row: rowNumber, reason: `"${name}" already exists in your company (same email, or same name and phone)` });
        continue;
      }

      let savedEmployeeId: unknown = null;
      try {
        const generatedEmail = await generateCompanyEmail(name, company.companyName);
        const placeholderPassword = generateRandomPassword();
        const passwordHash = await bcryptjs.hash(placeholderPassword, 10);
        const { token: setupToken, hashedToken, expires } = generatePasswordSetupToken();

        const newEmployee = new User({
          name,
          email: generatedEmail,
          personalEmail,
          passwordHash,
          department: (mappedRow.department || 'General').toString().trim() || 'General',
          role: 'employee',
          companyId: employeeCompanyId,
          points: 0,
          badge: 'Rookie',
          phoneNumber: phone,
          isPasswordSet: false,
          passwordSetupToken: hashedToken,
          passwordSetupTokenExpires: expires,
          createdByAdmin: req.user.id,
        });

        await newEmployee.save();
        savedEmployeeId = newEmployee._id;

        await sendEmployeeSetupEmail({
          to: personalEmail,
          loginEmail: generatedEmail,
          name,
          companyName: company.companyName,
          rawToken: setupToken,
        });

        created.push({ name, email: generatedEmail });
      } catch (rowError: any) {
        console.error(`BULK ROW ${rowNumber} ERROR:`, rowError);
        // Roll back the employee if it was saved but the email failed
        if (savedEmployeeId) {
          await User.findByIdAndDelete(savedEmployeeId as any);
        }
        skipped.push({
          row: rowNumber,
          reason: savedEmployeeId
            ? 'Setup email could not be sent, so this employee was not created'
            : (rowError?.message || 'Unknown error creating this row'),
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        createdCount: created.length,
        created,
        skippedCount: skipped.length,
        skipped,
        unmatchedColumns: unmatched, // columns from the sheet that didn't match any known field
      },
    });
  } catch (error) {
    console.error('BULK CREATE ERROR:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to bulk create employees' });
    }
  }
};

export const updateEmployee = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { name, email, department, role, points, badge, password, phoneNumber } = req.body;
    const employee = await User.findById(id);

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Check access
    if (req.user.role !== 'super_admin' && req.user.companyId !== employee.companyId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    // Update fields
    if (name) employee.name = name;
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
      if (existingUser) {
        throw new AppError('Email already exists', 409);
      }
      employee.email = email.toLowerCase().trim();
    }
    if (department) employee.department = department;
    if (role && (req.user.role === 'super_admin' || req.user.role === 'admin')) {
      employee.role = role;
    }
    if (typeof points === 'number') employee.points = points;
    if (badge) employee.badge = badge;
    if (phoneNumber !== undefined) employee.phoneNumber = phoneNumber;
    if (password) {
      employee.passwordHash = await bcryptjs.hash(password, 10);
    }

    await employee.save();

    const employeeResponse = employee.toObject();
    delete (employeeResponse as any).passwordHash;

    res.json({
      success: true,
      data: employeeResponse,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update employee' });
    }
  }
};

export const deleteEmployee = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    const employee = await User.findById(id);

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Check access
    if (req.user.role !== 'super_admin' && req.user.companyId !== employee.companyId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    // Prevent deleting yourself
    if (employee._id.toString() === req.user.id) {
      throw new AppError('Cannot delete your own account', 400);
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      data: { message: 'Employee deleted successfully' },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete employee' });
    }
  }
};

export const getDepartments = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    // companyId: super_admin may filter via query; everyone else is locked to their JWT companyId
    const targetCompanyId = req.user.role === 'super_admin'
      ? ((req.query.companyId as string | undefined) || req.user.companyId)
      : req.user.companyId;

    const query = targetCompanyId ? { companyId: targetCompanyId } : {};
    const departments = await User.distinct('department', query);

    res.json({
      success: true,
      data: departments.filter(Boolean),
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch departments' });
    }
  }
};