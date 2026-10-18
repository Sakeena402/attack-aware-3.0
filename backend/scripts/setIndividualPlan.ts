// backend/scripts/setIndividualPlan.ts
// Sets which plan an individual account is on. Only accounts with role "individual" are accepted.
// Run from the backend folder:
//   npx tsx scripts/setIndividualPlan.ts someone@example.com ind-premium
//   npx tsx scripts/setIndividualPlan.ts someone@example.com ind-basic

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';

const VALID_PLANS = ['ind-basic', 'ind-premium'];

async function main() {
  const [emailArg, planArg] = process.argv.slice(2);

  if (!emailArg || !planArg || !VALID_PLANS.includes(planArg)) {
    console.log('Usage: npx tsx scripts/setIndividualPlan.ts <email> <ind-basic|ind-premium>');
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email: emailArg.trim().toLowerCase() });
  if (!user) {
    console.log(`No account found for ${emailArg}`);
  } else if (user.role !== 'individual') {
    console.log(`${emailArg} is a "${user.role}" account. Only individual accounts can be set here.`);
  } else {
    user.subscriptionPlan = planArg;
    await user.save();
    console.log(`${emailArg} is now on ${planArg}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});