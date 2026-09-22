/**
 * generateAllQuizzes.ts
 *
 * Script to trigger all four quiz generation flows and log token usage.
 * Run with: npx tsx scripts/generateAllQuizzes.ts
 *
 * Steps:
 * 1. Connect to MongoDB
 * 2. Find/create a super_admin user and test company
 * 3. Trigger each quiz generation flow
 * 4. Query AIGenerationLog for token usage
 * 5. Print a summary table
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Quiz } from '../src/models/Quiz.js';
import { QuizQuestion } from '../src/models/QuizQuestion.js';
import { AIGenerationLog } from '../src/models/AIGenerationLog.js';
import { generateAdminQuiz } from '../src/services/ai/adminQuizService.js';
import { runMonthlyQuizGeneration } from '../src/services/ai/monthlyQuizService.js';
import { generateAdaptiveQuiz } from '../src/services/ai/adaptiveQuizService.js';

interface GenerationResult {
  quizType: string;
  quizId: string;
  inputTokens: number | string;
  outputTokens: number | string;
  latencyMs: number | string;
  questionsCount: number;
  success: boolean;
  error?: string;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AttackAware 3.0 — Quiz Generation Token Usage Report');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();

  // Connect to database
  await connectDB();
  console.log('[DB] Connected\n');

  // Find or create a test company and users
  let company = await Company.findOne({ companyName: 'GenerateAll Test Corp' });
  if (!company) {
    company = await Company.create({
      companyName: 'GenerateAll Test Corp',
      industry: 'Technology',
      companySize: '50-100',
      adminId: new mongoose.Types.ObjectId(),
      approvalStatus: 'approved',
    });
    console.log(`[SETUP] Created test company: ${company._id}`);
  }

  let superAdmin = await User.findOne({ email: 'generateall-super@test.com' });
  if (!superAdmin) {
    const bcrypt = await import('bcryptjs');
    superAdmin = await User.create({
      name: 'GenerateAll Super Admin',
      email: 'generateall-super@test.com',
      passwordHash: await bcrypt.hash('Test1234!', 10),
      role: 'super_admin',
    });
    console.log(`[SETUP] Created super_admin: ${superAdmin._id}`);
  }

  let employee = await User.findOne({ email: 'generateall-emp@test.com' });
  if (!employee) {
    const bcrypt = await import('bcryptjs');
    employee = await User.create({
      name: 'GenerateAll Employee',
      email: 'generateall-emp@test.com',
      passwordHash: await bcrypt.hash('Test1234!', 10),
      role: 'employee',
      companyId: company._id,
      department: 'Engineering',
    });
    console.log(`[SETUP] Created employee: ${employee._id}`);
  }

  const results: GenerationResult[] = [];

  // ─────────────────────────────────────────────────────────────────────
  // 1. Admin-manual quiz
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n─── 1. Admin-Manual Quiz ───');
  try {
    const startTime = Date.now();
    const adminResult = await generateAdminQuiz({
      companyId: company._id.toString(),
      employeeId: employee._id.toString(),
      requestedBy: superAdmin._id.toString(),
      topicMode: 'manual',
      topic: 'Phishing Awareness',
      dueInDays: 14,
    });
    const elapsed = Date.now() - startTime;

    const questions = await QuizQuestion.find({ quizId: adminResult.quizId }).lean();
    const log = await AIGenerationLog.findOne({
      purpose: 'admin_triggered_quiz_generation',
    }).sort({ createdAt: -1 }).lean() as any;

    results.push({
      quizType: 'admin-manual',
      quizId: adminResult.quizId,
      inputTokens: log?.inputTokens ?? 'N/A',
      outputTokens: log?.outputTokens ?? 'N/A',
      latencyMs: log?.latencyMs ?? elapsed,
      questionsCount: questions.length,
      success: true,
    });
    console.log(`   ✅ Quiz ${adminResult.quizId} — ${questions.length} questions — ${elapsed}ms`);
  } catch (err: any) {
    console.error(`   ❌ Failed:`, err.message);
    results.push({
      quizType: 'admin-manual',
      quizId: 'N/A',
      inputTokens: 'N/A',
      outputTokens: 'N/A',
      latencyMs: 'N/A',
      questionsCount: 0,
      success: false,
      error: err.message,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // 2. Admin-auto quiz
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n─── 2. Admin-Auto Quiz ───');
  try {
    const startTime = Date.now();
    const autoResult = await generateAdminQuiz({
      companyId: company._id.toString(),
      employeeId: employee._id.toString(),
      requestedBy: superAdmin._id.toString(),
      topicMode: 'auto',
      dueInDays: 14,
    });
    const elapsed = Date.now() - startTime;

    const questions = await QuizQuestion.find({ quizId: autoResult.quizId }).lean();
    const log = await AIGenerationLog.findOne({
      purpose: 'admin_triggered_quiz_generation',
    }).sort({ createdAt: -1 }).lean() as any;

    results.push({
      quizType: 'admin-auto',
      quizId: autoResult.quizId,
      inputTokens: log?.inputTokens ?? 'N/A',
      outputTokens: log?.outputTokens ?? 'N/A',
      latencyMs: log?.latencyMs ?? elapsed,
      questionsCount: questions.length,
      success: true,
    });
    console.log(`   ✅ Quiz ${autoResult.quizId} — ${questions.length} questions — ${elapsed}ms`);
  } catch (err: any) {
    console.error(`   ❌ Failed:`, err.message);
    results.push({
      quizType: 'admin-auto',
      quizId: 'N/A',
      inputTokens: 'N/A',
      outputTokens: 'N/A',
      latencyMs: 'N/A',
      questionsCount: 0,
      success: false,
      error: err.message,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3. Monthly quiz
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n─── 3. Monthly Quiz ───');
  try {
    const startTime = Date.now();
    const monthlySummary = await runMonthlyQuizGeneration(14);
    const elapsed = Date.now() - startTime;

    const successResult = monthlySummary.results.find(r => r.success);
    if (successResult?.quizId) {
      const questions = await QuizQuestion.find({ quizId: successResult.quizId }).lean();
      const log = await AIGenerationLog.findOne({
        purpose: 'monthly_quiz_generation',
      }).sort({ createdAt: -1 }).lean() as any;

      results.push({
        quizType: 'monthly',
        quizId: successResult.quizId,
        inputTokens: log?.inputTokens ?? 'N/A',
        outputTokens: log?.outputTokens ?? 'N/A',
        latencyMs: log?.latencyMs ?? elapsed,
        questionsCount: questions.length,
        success: true,
      });
      console.log(`   ✅ Quiz ${successResult.quizId} — ${questions.length} questions — ${elapsed}ms`);
    } else {
      results.push({
        quizType: 'monthly',
        quizId: 'N/A',
        inputTokens: 'N/A',
        outputTokens: 'N/A',
        latencyMs: elapsed,
        questionsCount: 0,
        success: false,
        error: monthlySummary.results[0]?.error || 'No successful generation',
      });
    }
  } catch (err: any) {
    console.error(`   ❌ Failed:`, err.message);
    results.push({
      quizType: 'monthly',
      quizId: 'N/A',
      inputTokens: 'N/A',
      outputTokens: 'N/A',
      latencyMs: 'N/A',
      questionsCount: 0,
      success: false,
      error: err.message,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // 4. Adaptive quiz (deprecated but still callable)
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n─── 4. Adaptive Quiz (deprecated) ───');
  try {
    const startTime = Date.now();
    const adaptiveResult = await generateAdaptiveQuiz({
      employeeId: employee._id.toString(),
      attackType: 'phishing',
      templateCategory: 'Credential Harvesting',
      failureEventId: new mongoose.Types.ObjectId().toString(),
      eventType: 'linkClicked',
    });
    const elapsed = Date.now() - startTime;

    const questions = await QuizQuestion.find({ quizId: adaptiveResult.quizId }).lean();
    const log = await AIGenerationLog.findOne({
      purpose: 'adaptive_quiz_generation',
    }).sort({ createdAt: -1 }).lean() as any;

    results.push({
      quizType: 'adaptive',
      quizId: adaptiveResult.quizId,
      inputTokens: log?.inputTokens ?? 'N/A',
      outputTokens: log?.outputTokens ?? 'N/A',
      latencyMs: log?.latencyMs ?? elapsed,
      questionsCount: questions.length,
      success: true,
    });
    console.log(`   ✅ Quiz ${adaptiveResult.quizId} — ${questions.length} questions — ${elapsed}ms`);
  } catch (err: any) {
    console.error(`   ❌ Failed:`, err.message);
    results.push({
      quizType: 'adaptive',
      quizId: 'N/A',
      inputTokens: 'N/A',
      outputTokens: 'N/A',
      latencyMs: 'N/A',
      questionsCount: 0,
      success: false,
      error: err.message,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Summary Table
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();
  console.table(
    results.map(r => ({
      'Quiz Type': r.quizType,
      'Quiz ID': typeof r.quizId === 'string' ? r.quizId.slice(-8) : r.quizId,
      'Input Tokens': r.inputTokens,
      'Output Tokens': r.outputTokens,
      'Latency (ms)': r.latencyMs,
      'Questions': r.questionsCount,
      'Status': r.success ? '✅' : '❌',
    }))
  );

  // Check minimum questions requirement
  const failures = results.filter(r => r.success && r.questionsCount < 15);
  if (failures.length > 0) {
    console.error('\n⚠️  WARNING: The following quizzes have < 15 questions:');
    for (const f of failures) {
      console.error(`   - ${f.quizType}: ${f.questionsCount} questions (quiz ${f.quizId})`);
    }
    console.error('   Consider increasing maxTokens further.\n');
    process.exit(1);
  } else {
    console.log('\n✅ All generated quizzes have ≥ 15 questions.\n');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
