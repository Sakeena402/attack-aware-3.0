// backend/scripts/createTestIndividual.ts
// Creates (or resets the password of) a dedicated test individual account.
// Run from the backend folder with: npx tsx scripts/createTestIndividual.ts

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { connectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';

const EMAIL = 'plantest-individual@test.com';
const PASSWORD = 'Password123!';

async function main() {
  await connectDB();

  const passwordHash = await bcryptjs.hash(PASSWORD, 10);
  const existing = await User.findOne({ email: EMAIL });

  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Reset password for existing test account ${EMAIL}`);
  } else {
    await User.create({
      name: 'Plan Test Individual',
      email: EMAIL,
      passwordHash,
      role: 'individual',
    });
    console.log(`Created test account ${EMAIL}`);
  }

  console.log(`Login with: ${EMAIL} / ${PASSWORD}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});