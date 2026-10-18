// backend/scripts/removeTestIndividual.ts
// Removes the dedicated test individual account and everything it created.
// Run from the backend folder with: npx tsx scripts/removeTestIndividual.ts

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';

const EMAIL = 'plantest-individual@test.com';

async function registerAllModels() {
  const dir = path.resolve(process.cwd(), 'src', 'models');
  for (const file of fs.readdirSync(dir)) {
    if (!/\.(ts|js)$/.test(file) || file.endsWith('.d.ts')) continue;
    try {
      await import(pathToFileURL(path.join(dir, file)).href);
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  await connectDB();
  await registerAllModels();

  const user = await User.findOne({ email: EMAIL });
  if (!user) {
    console.log('Test account not found — nothing to remove.');
  } else {
    const userId = user._id;
    const cleanups: Array<[string, string]> = [
      ['ContentUsage', 'usage rows'],
      ['PointsAward', 'points ledger rows'],
      ['UserGame', 'game scores'],
      ['UserQuiz', 'quiz attempts'],
      ['UserVideo', 'video records'],
      ['SubscriptionRequest', 'plan requests'],
    ];
    for (const [modelName, label] of cleanups) {
      try {
        const result = await mongoose.model(modelName).deleteMany({ userId });
        console.log(`Removed ${result.deletedCount} ${label}`);
      } catch {
        console.log(`(skipped ${modelName}: model not found)`);
      }
    }
    await User.deleteOne({ _id: userId });
    console.log(`Removed test account ${EMAIL}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});