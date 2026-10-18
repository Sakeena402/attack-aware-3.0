// backend/scripts/syncPlanFeatures.ts
// Rewrites each sheet plan's `features` list from config/planLimits.ts so the plan cards
// match what the backend enforces. Kept: (1) strings that backend code passes to
// requireFeature() / companyHasFeature(), (2) that plan's own marketing lines in frontend plans.ts.
// Everything else (old labels like "AI Quizzes", "Unlimited Employees") is removed.
// DRY RUN by default. Run from the backend folder:
//   npx tsx scripts/syncPlanFeatures.ts
//   npx tsx scripts/syncPlanFeatures.ts --apply

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import { PLAN_LIMITS, PlanLimits } from '../src/config/planLimits.js';

const APPLY = process.argv.includes('--apply');

const CHANNELS = ['phishing', 'smishing', 'vishing'] as const;
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage', 'scripts']);

/** Loads every model file so the plan model is registered. */
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

/** Finds every feature string that backend code actually checks, with the file that checks it. */
function findFeatureChecks(): Map<string, string> {
  const found = new Map<string, string>();
  const root = path.resolve(process.cwd(), 'src');

  const patterns = [
    /requireFeature\(\s*(['"`])((?:(?!\1).)+)\1/g,
    /companyHasFeature\(\s*[^,()]+,\s*(['"`])((?:(?!\1).)+)\1/g,
  ];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
        continue;
      }
      if (!/\.(ts|js)$/.test(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (full.toLowerCase().includes('seed')) continue;

      // Comments are ignored so examples in comments do not count as checks
      const text = fs
        .readFileSync(full, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

      for (const re of patterns) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          if (!found.has(m[2])) found.set(m[2], path.relative(process.cwd(), full));
        }
      }
    }
  };

  walk(root);
  return found;
}

/** Marketing lines per plan from the frontend plans.ts. */
async function loadMarketing(): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  try {
    const file = path.resolve(process.cwd(), '..', 'frontend', 'app', 'data', 'plans.ts');
    const mod: any = await import(pathToFileURL(file).href);
    const list: any[] = mod.plans ?? mod.default?.plans ?? [];
    for (const p of list) map.set(p.id, new Set<string>(p.features ?? []));
  } catch (err: any) {
    console.log(`(could not read frontend plans.ts: ${err.message})`);
  }
  return map;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function buildFeatures(plan: any, limits: PlanLimits): string[] {
  const individual = plan.category === 'individual';
  const per = individual ? 'per month' : 'per user per month';
  const c = limits.content;
  const out: string[] = [];

  out.push(plan.maxEmployees <= 1 ? '1 user' : `Up to ${plan.maxEmployees} employees`);
  if (plan.billing === 'trial' && plan.trialDays) out.push(`${plan.trialDays}-day trial`);

  out.push(`${c.videosEn} English + ${c.videosUr} Urdu videos ${per}`);
  out.push(`${plural(c.games, 'game')} ${per}`);
  out.push(`${c.quizzesEn} English + ${c.quizzesUr} Urdu quizzes ${per}`);
  if (limits.ai.quizzes) out.push('AI-generated quizzes');

  for (const ch of CHANNELS) {
    const n = limits.campaignsPerMonth[ch];
    if (n > 0) out.push(`${plural(n, `${ch} campaign`)} per month`);
  }

  const aiChannels = CHANNELS.filter((ch) => limits.ai[ch] && limits.campaignsPerMonth[ch] > 0);
  if (aiChannels.length > 0) out.push(`AI-generated scenarios for ${aiChannels.join(', ')}`);

  return out;
}

async function main() {
  await connectDB();
  await registerAllModels();

  const Plan = mongoose.model('MembershipPlan');
  const plans: any[] = await Plan.find({ planId: { $in: Object.keys(PLAN_LIMITS) } }).lean();

  const checks = findFeatureChecks();
  const marketing = await loadMarketing();

  console.log(APPLY ? '\n*** APPLY MODE: changes will be written ***' : '\n*** DRY RUN: nothing will be changed ***');

  console.log('\nFeature strings that backend code actually checks:');
  if (checks.size === 0) console.log('   (none found)');
  for (const [feature, file] of checks) console.log(`   "${feature}"   [${file}]`);
  console.log('');

  for (const plan of plans) {
    const limits = PLAN_LIMITS[plan.planId];
    const generated = buildFeatures(plan, limits);
    const mine = marketing.get(plan.planId) ?? new Set<string>();

    const existing: string[] = plan.features ?? [];
    const kept: Array<{ text: string; why: string }> = [];
    const removed: string[] = [];

    for (const f of existing) {
      if (generated.includes(f)) continue; // already in the new list
      if (checks.has(f)) kept.push({ text: f, why: `checked in ${checks.get(f)}` });
      else if (mine.has(f)) kept.push({ text: f, why: 'marketing line in frontend plans.ts' });
      else removed.push(f);
    }

    const finalList = [...generated, ...kept.map((k) => k.text)];

    console.log(`── ${plan.planId} (${plan.name}) ──`);
    if (plan.billing === 'trial' && plan.trialDays !== 15) {
      console.log(`   WARNING: trialDays is ${plan.trialDays ?? 'not set'} but the sheet says 15 days`);
    }
    console.log('   New list:');
    generated.forEach((g) => console.log(`     + ${g}`));
    if (kept.length) {
      console.log('   Kept:');
      kept.forEach((k) => console.log(`     = ${k.text}   (${k.why})`));
    }
    if (removed.length) {
      console.log('   Removed:');
      removed.forEach((r) => console.log(`     - ${r}`));
    }
    console.log('');

    if (APPLY) {
      await Plan.updateOne({ _id: plan._id }, { $set: { features: finalList } });
    }
  }

  console.log(APPLY ? `Done: ${plans.length} plan(s) updated.` : 'This was a dry run. Re-run with --apply to write these changes.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});