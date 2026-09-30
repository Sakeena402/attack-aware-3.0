// backend/scripts/migrateLegacyPlans.ts
// Moves companies that are on the old plan documents (no planId) onto the sheet plans.
// DRY RUN by default: prints what would change. Add --apply to write the changes.
//   npx tsx scripts/migrateLegacyPlans.ts
//   npx tsx scripts/migrateLegacyPlans.ts --apply

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

const APPLY = process.argv.includes('--apply');

// Old plan name -> sheet planId. Edit this if you want a different mapping.
const PLAN_MAP: Record<string, string> = {
  'Basic': 'ent-basic',
  'Professional': 'ent-advanced',
  'Enterprise Premium': 'ent-premium',
};

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
  const allPlans: any[] = await Plan.find().lean();

  const targets = new Map<string, any>();
  for (const p of allPlans) if (p.planId) targets.set(p.planId, p);

  // Legacy = not in config/planLimits.ts
  const legacyPlans = allPlans.filter((p) => !getLimitsForPlan(p));

  console.log(APPLY ? '\n*** APPLY MODE: changes will be written ***' : '\n*** DRY RUN: nothing will be changed ***');

  const rows: any[] = [];
  let moved = 0;

  for (const legacy of legacyPlans) {
    const targetPlanId = PLAN_MAP[legacy.name];
    const target = targetPlanId ? targets.get(targetPlanId) : undefined;

    const companies: any[] = await Company.find({ subscriptionPlan: legacy._id }).lean();
    for (const c of companies) {
      // Same seat rule the middleware uses: everyone except the owner admin
      const employees = await User.countDocuments({ companyId: c._id, _id: { $ne: c.adminId } });

      if (!target) {
        rows.push({ company: c.companyName, from: legacy.name, to: '(no mapping — skipped)', employees, seats: '-', seatCheck: '-' });
        continue;
      }

      const seats = target.maxEmployees;
      rows.push({
        company: c.companyName,
        from: `${legacy.name} (${legacy.maxEmployees} seats)`,
        to: `${target.name} [${target.planId}]`,
        employees,
        seats,
        seatCheck: employees > seats ? `OVER by ${employees - seats}` : 'ok',
      });

      if (APPLY) {
        await Company.updateOne({ _id: c._id }, { $set: { subscriptionPlan: target._id } });
        moved++;
      }
    }
  }

  console.table(rows);

  if (APPLY) {
    // Hide the old plans so new companies cannot pick them (reversible: set isActive back to true)
    for (const legacy of legacyPlans) {
      const stillUsed = await Company.countDocuments({ subscriptionPlan: legacy._id });
      if (stillUsed === 0 && legacy.isActive) {
        await Plan.updateOne({ _id: legacy._id }, { $set: { isActive: false } });
        console.log(`Deactivated old plan "${legacy.name}" (${legacy.maxEmployees} seats)`);
      } else if (stillUsed > 0) {
        console.log(`Kept old plan "${legacy.name}" active — ${stillUsed} company(ies) still on it`);
      }
    }
    console.log(`\nDone: ${moved} company(ies) moved.`);
  } else {
    console.log('\nThis was a dry run. Re-run with --apply to write these changes.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});