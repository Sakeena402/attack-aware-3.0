// backend/scripts/removeIndividualPdfReports.ts
// Removes "PDF reports" from the individual plans only (individuals have no Reports page).
// Enterprise plans keep it, because the PDF report routes check it.
// Run from the backend folder with: npx tsx scripts/removeIndividualPdfReports.ts

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';

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

  const Plan = mongoose.model('MembershipPlan');
  const result = await Plan.updateMany({ category: 'individual' }, { $pull: { features: 'PDF reports' } });
  console.log(`Matched ${result.matchedCount} individual plan(s), changed ${result.modifiedCount}`);

  const plans: any[] = await Plan.find({ category: 'individual' }).lean();
  for (const p of plans) {
    console.log(`\n${p.planId} (${p.name}) now shows:`);
    (p.features ?? []).forEach((f: string) => console.log(`   - ${f}`));
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});