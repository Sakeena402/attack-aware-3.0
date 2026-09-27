/**
 * Shared test helpers for backend tests.
 * Sets up MongoDB connection, creates test users/companies, and provides JWT tokens.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { generateToken } from '../src/utils/jwt.js';
import bcrypt from 'bcryptjs';

// Use MONGODB_URI from environment
const TEST_MONGO_URI =
  process.env.TEST_MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/attackaware_test';

/**
 * Connect to the test database.
 */
export async function connectTestDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  }
}

/**
 * Disconnect from the test database.
 */
export async function disconnectTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

/**
 * Clean up specific collections used by tests.
 */
export async function cleanupTestData(collections: string[]): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  for (const name of collections) {
    try {
      const col = mongoose.connection.collection(name);
      await col.deleteMany({});
    } catch {
      /* collection may not exist yet */
    }
  }
}

export interface TestCompany {
  _id: mongoose.Types.ObjectId;
  companyName: string;
}

export interface TestUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  role: string;
  companyId?: mongoose.Types.ObjectId;
  token: string; // JWT for Authorization header
}

/**
 * Create a test company with a valid adminId.
 */
export async function createTestCompany(name: string, customAdminId?: mongoose.Types.ObjectId): Promise<TestCompany> {
  const adminId = customAdminId || new mongoose.Types.ObjectId();
  const company = await Company.create({
    companyName: name,
    industry: 'Technology',
    companySize: '50-100',
    adminId,
    approvalStatus: 'approved',
  });
  return { _id: company._id as mongoose.Types.ObjectId, companyName: name };
}

/**
 * Create a test user and return a signed JWT token.
 */
export async function createTestUser(opts: {
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'employee';
  companyId?: mongoose.Types.ObjectId;
}): Promise<TestUser> {
  const passwordHash = await bcrypt.hash('Test1234!', 10);
  const user = await User.create({
    name: opts.name,
    email: opts.email,
    passwordHash,
    role: opts.role,
    companyId: opts.companyId,
  });

  const userId = (user._id as mongoose.Types.ObjectId).toString();
  const token = generateToken(
    userId,
    opts.email,
    opts.role,
    opts.companyId?.toString()
  );

  return {
    _id: user._id as mongoose.Types.ObjectId,
    email: opts.email,
    role: opts.role,
    companyId: opts.companyId,
    token,
  };
}
