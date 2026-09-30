// backend/scripts/listPlans.ts
// Read-only. Lists every membership plan document and how many companies are on it.
// Run from the backend folder with: npx tsx scripts/listPlans.ts

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import { Company } from '../src/models/Company.js';

/** Loads every model file so populate() can find them (e.g. MembershipPlan). */
async function registerAllModels() {
  const dir = path.resolve(process.cwd(), 'src', 'models');
  for (const file of fs.readdirSync(dir)) {
    if (!/\.(ts|js)$/.test(file) || file.endsWith('.d.ts')) continue;
    try {
      await import(pathToFileURL(path.join(dir, file)).href);
    } catch (err: any) {
      console.log(`(skipped model file ${file}: ${err.message})`);
    }
  }
}

async function main() {
  await connectDB();
  await registerAllModels();

  const Plan = mongoose.model('MembershipPlan');
  const plans: any[] = await Plan.find().lean();

  const counts = await Company.aggregate([{ $group: { _id: '$subscriptionPlan', n: { $sum: 1 } } }]);
  const countByPlan = new Map(counts.map((c: any) => [String(c._id), c.n]));

  console.log('\n=== MEMBERSHIP PLANS ===');
  console.table(
    plans.map((p) => ({
      id: String(p._id).slice(-8),
      planId: p.planId ?? '(none)',
      name: p.name,
      category: p.category,
      billing: p.billing,
      maxEmployees: p.maxEmployees ?? '-',
      priceUSD: p.priceUSD ?? '-',
      active: p.isActive,
      companies: countByPlan.get(String(p._id)) ?? 0,
    }))
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});