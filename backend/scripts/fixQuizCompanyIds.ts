// backend/scripts/fixQuizCompanyIds.ts
// One-off: gives AI-generated quizzes that have no companyId the companyId of the employee
// they were generated for. Run with: npx tsx scripts/fixQuizCompanyIds.ts

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import { Quiz } from '../src/models/Quiz.js';
import { User } from '../src/models/User.js';

async function main() {
  await connectDB();

  const quizzes = await Quiz.find({
    source: 'ai_generated',
    $or: [{ companyId: { $exists: false } }, { companyId: null }],
  });

  console.log(`Found ${quizzes.length} AI quiz(zes) without a companyId`);

  let fixed = 0;
  for (const quiz of quizzes) {
    const employeeId = quiz.triggerContext?.employeeId;
    const employee = employeeId ? await User.findById(employeeId).select('companyId').lean() : null;

    if (employee?.companyId) {
      quiz.companyId = employee.companyId;
      await quiz.save();
      fixed++;
      console.log(`fixed ${quiz._id} -> company ${employee.companyId}`);
    } else {
      console.log(`SKIPPED ${quiz._id} — no employee/company found (needs manual review)`);
    }
  }

  console.log(`Done: ${fixed} fixed, ${quizzes.length - fixed} skipped`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});