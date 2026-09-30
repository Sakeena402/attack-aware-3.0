// backend/scripts/auditPlans.ts
// Read-only. Prints (1) each company's plan and whether the monthly AI-quiz job would run for it,
// and (2) what the individual accounts have stored in subscriptionPlan / subscriptionPackage.
// Run from the backend folder with: npx tsx scripts/auditPlans.ts

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import { Company } from '../src/models/Company.js';
import { User } from '../src/models/User.js';
import { getLimitsForPlan } from '../src/config/planLimits.js';
import { companyAllowsAiQuizzes } from '../src/services/planLimitsService.js';

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

  // ── 1. Companies ──────────────────────────────────────────────
  const companies: any[] = await Company.find().populate('subscriptionPlan').lean();
  const rows = [];
  for (const c of companies) {
    const plan = c.subscriptionPlan;
    rows.push({
      company: c.companyName,
      approval: c.approvalStatus,
      planId: plan?.planId ?? '(none)',
      plan: plan?.name ?? '(none)',
      inLimitsTable: plan ? (getLimitsForPlan(plan) ? 'yes' : 'NO (legacy)') : '-',
      monthlyAiQuiz: (await companyAllowsAiQuizzes(c._id)) ? 'YES' : 'no',
    });
  }
  console.log('\n=== COMPANIES ===');
  console.table(rows);

  // ── 2. Individual accounts ────────────────────────────────────
  const groups = await User.aggregate([
    { $match: { role: 'individual' } },
    {
      $group: {
        _id: { plan: '$subscriptionPlan', pkg: '$subscriptionPackage' },
        count: { $sum: 1 },
        sampleEmails: { $push: '$email' },
      },
    },
  ]);
  console.log('\n=== INDIVIDUAL ACCOUNTS ===');
  console.table(
    groups.map((g) => ({
      subscriptionPlan: g._id.plan ?? '(empty)',
      subscriptionPackage: g._id.pkg ?? '(empty)',
      count: g.count,
      examples: g.sampleEmails.slice(0, 3).join(', '),
    }))
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});