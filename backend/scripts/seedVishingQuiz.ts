// backend/scripts/seedVishingQuiz.ts
//
// Run once with:  npx tsx scripts/seedVishingQuiz.ts
// (from the backend/ folder, with your .env already configured)
//
// Idempotent — safe to run multiple times; it replaces the quiz + questions
// each time so you can re-run after editing the content below.

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { Quiz } from '../src/models/Quiz.js';
import { QuizQuestion } from '../src/models/QuizQuestion.js';

// Fixed ID so the frontend CTA link (/dashboard/quizzes/<this-id>) never breaks,
// no matter when this script is (re)run.
const VISHING_QUIZ_ID = new mongoose.Types.ObjectId('6f0000000000000000000001');

const QUESTIONS: Array<{
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correctOption: 'a' | 'b' | 'c' | 'd';
  explanation: string;
}> = [
  {
    question:
      'You get a call from someone claiming to be IT Support. They say your account is compromised and ask for the OTP that was just texted to you. What should you do?',
    option_a: 'Read them the OTP quickly so they can secure your account',
    option_b: 'Hang up and contact IT through the official internal number or portal',
    option_c: 'Give them the OTP but ask for their employee ID first',
    option_d: 'Text the OTP to them instead of saying it out loud',
    correctOption: 'b',
    explanation: 'No legitimate IT team will ever ask for your OTP over the phone. Always verify through official channels.',
  },
  {
    question:
      'A caller says they are from your bank and asks you to "confirm" your full card number and CVV to stop a fraudulent transaction. What is the safest response?',
    option_a: 'Give the last 4 digits only, since that seems safer',
    option_b: 'Provide the details since the transaction sounds urgent',
    option_c: 'Refuse, hang up, and call your bank using the number on the back of your card',
    option_d: 'Ask them to email you the request instead',
    correctOption: 'c',
    explanation: 'Banks never ask for full card numbers or CVVs over an unsolicited call. Always call back using a verified number.',
  },
  {
    question:
      "Someone calls claiming to be your company's CEO, sounding rushed, and asks you to purchase gift cards immediately for a \"client emergency.\" What is the biggest red flag here?",
    option_a: 'The request came by phone instead of email',
    option_b: 'The urgency and unusual payment method (gift cards) are being used to bypass normal approval steps',
    option_c: 'CEOs never call employees directly',
    option_d: 'There is no red flag if the caller sounds confident',
    correctOption: 'b',
    explanation: 'Urgency plus an unusual, hard-to-trace payment method (gift cards) is a classic executive-impersonation scam pattern.',
  },
  {
    question:
      "A caller's ID shows your company's real internal help-desk number. Does this guarantee the call is legitimate?",
    option_a: 'Yes, caller ID cannot be faked',
    option_b: 'No — caller ID can be spoofed to display any number, including real internal ones',
    option_c: 'Yes, as long as they know your name',
    option_d: 'No, but only for international calls',
    correctOption: 'b',
    explanation: 'Caller ID spoofing is trivial for attackers. Never trust a call based on the displayed number alone.',
  },
  {
    question:
      "You suspect a call you just received was a vishing attempt, but you didn't share any sensitive information. What should you do next?",
    option_a: "Nothing — no harm was done since you didn't share anything",
    option_b: 'Report the call to your security/IT team so they can warn others and track the pattern',
    option_c: 'Block the number yourself and forget about it',
    option_d: 'Call the number back to ask who they really are',
    correctOption: 'b',
    explanation: 'Reporting helps your security team spot patterns and warn other employees, even if you personally weren\'t affected.',
  },
];

async function seed() {
  await connectDB();

  // Replace any existing quiz + questions at this fixed ID (safe re-run).
  await QuizQuestion.deleteMany({ quizId: VISHING_QUIZ_ID });
  await Quiz.deleteOne({ _id: VISHING_QUIZ_ID });

  await Quiz.create({
    _id: VISHING_QUIZ_ID,
    title: 'Vishing Awareness Quiz',
    description: 'Test what you learned about spotting voice-phishing (vishing) attempts.',
    category: 'vishing',
    difficulty: 'easy',
    totalQuestions: QUESTIONS.length,
    timeLimit: 40,
    order: 9999, // keep it out of the normal unlock sequence — always accessible
    targetRoles: ['employee'],
  });

  for (const q of QUESTIONS) {
    const correctText = q[`option_${q.correctOption}` as `option_${'a' | 'b' | 'c' | 'd'}`];

    await QuizQuestion.create({
      quizId: VISHING_QUIZ_ID,
      category: 'vishing',
      difficulty: 'easy',
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correctOption: q.correctOption,
      answer: correctText, // required field — the correct option's text
      explanation: q.explanation,
    });
  }

  console.log(`✅ Seeded "Vishing Awareness Quiz" with ${QUESTIONS.length} questions.`);
  console.log(`   Quiz ID: ${VISHING_QUIZ_ID.toString()}`);

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});