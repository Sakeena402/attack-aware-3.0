import { Types } from 'mongoose';
import { z } from 'zod';
import { Quiz } from '../../models/Quiz.js';
import { QuizQuestion } from '../../models/QuizQuestion.js';
import { UserQuiz } from '../../models/UserQuiz.js';
import { aiService } from './aiService.js';
import { AppError } from '../../utils/errorHandler.js';

export interface AdaptiveQuizParams {
  employeeId: string;
  attackType: string;
  templateCategory: string;
  failureEventId: string;
  eventType: 'credentialsSubmitted' | 'linkClicked';
}

export interface GeneratedQuestionItem {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correctOption: 'a' | 'b' | 'c' | 'd';
  answer: string;
  explanation: string;
}

export interface GeneratedQuizPayload {
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: GeneratedQuestionItem[];
}

const quizQuestionZodSchema = z.object({
  question: z.string().min(5),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correctOption: z.enum(['a', 'b', 'c', 'd']),
  answer: z.string().min(1),
  explanation: z.string().min(5),
});

export const quizPayloadZodSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  category: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questions: z.array(quizQuestionZodSchema).min(15).max(25),
});

export const quizResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    category: { type: 'string' },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          option_a: { type: 'string' },
          option_b: { type: 'string' },
          option_c: { type: 'string' },
          option_d: { type: 'string' },
          correctOption: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
          answer: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: [
          'question',
          'option_a',
          'option_b',
          'option_c',
          'option_d',
          'correctOption',
          'answer',
          'explanation',
        ],
      },
      minItems: 15,
      maxItems: 25,
    },
  },
  required: ['title', 'description', 'category', 'difficulty', 'questions'],
};

export const generateAdaptiveQuiz = async (
  params: AdaptiveQuizParams
): Promise<{ quizId: string }> => {
  console.log(
    `[AdaptiveQuiz] 🔔 Triggered | employeeId="${params.employeeId}" | attackType="${params.attackType}" | eventType="${params.eventType}" | category="${params.templateCategory}"`
  );

  const userObjectId = new Types.ObjectId(params.employeeId);

  const recentQuizzes = await UserQuiz.find({ userId: userObjectId })
    .sort({ completedAt: -1 })
    .limit(5)
    .lean();

  const totalQuizzesPlayed = recentQuizzes.length;
  let avgScore = 0;
  if (totalQuizzesPlayed > 0) {
    const sumPct = recentQuizzes.reduce((acc, q) => {
      const total = q.totalQuestions || 1;
      return acc + (q.score / total) * 100;
    }, 0);
    avgScore = Math.round(sumPct / totalQuizzesPlayed);
  }

  console.log(
    `[AdaptiveQuiz] 📊 Employee quiz history | pastQuizzes=${totalQuizzesPlayed} | avgScore=${avgScore}%`
  );

  const systemPrompt = `You are an expert security awareness instructor.
Generate a targeted adaptive quiz for an employee who recently fell for a ${params.attackType} simulation (Category: ${params.templateCategory}, Event: ${params.eventType}).
Employee Quiz Performance Context: ${totalQuizzesPlayed} past quizzes completed, average score: ${avgScore}%.
Generate 15 multiple-choice questions focusing on identifying signals of ${params.attackType} and ${params.templateCategory} scams.
Output valid JSON matching the requested schema strictly.`;

  const userPrompt = `Create an adaptive quiz for an employee after a ${params.eventType} event in a ${params.attackType} scenario.`;

  console.log(`[AdaptiveQuiz] 🤖 Calling AI service for adaptive quiz...`);
  const aiResult = await aiService.generateStructured<GeneratedQuizPayload>(
    {
      systemPrompt,
      userPrompt,
      responseSchema: quizResponseSchema,
      schema: quizPayloadZodSchema,
      maxTokens: 4000,
    },
    {
      purpose: 'adaptive_quiz_generation',
    }
  );

  const payload = aiResult.data;
  console.log(
    `[AdaptiveQuiz] ✅ AI quiz received | title="${payload.title}" | questions=${payload.questions.length} | difficulty="${payload.difficulty}"`
  );

  // Use a transaction or single block so no broken quiz is left if question creation fails
  const createdQuiz = await Quiz.create({
    title: payload.title,
    description: payload.description,
    category: payload.category || params.templateCategory,
    difficulty: payload.difficulty || 'medium',
    totalQuestions: payload.questions.length,
    order: 999,
    source: 'ai_generated',
    companyId: user.companyId,
    status: 'published',
    triggerContext: {
      employeeId: userObjectId,
      attackType: params.attackType,
      templateCategory: params.templateCategory,
      failureEventId: new Types.ObjectId(params.failureEventId),
      eventType: params.eventType,
      generatedAt: new Date(),
    },
  });

  console.log(`[AdaptiveQuiz] 💾 Quiz document created | quizId="${createdQuiz._id}"`);

  try {
    const questionDocs = payload.questions.map((q) => ({
      quizId: createdQuiz._id,
      category: createdQuiz.category,
      difficulty: createdQuiz.difficulty,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correctOption: q.correctOption,
      answer: q.answer,
      explanation: q.explanation,
    }));

    await QuizQuestion.insertMany(questionDocs);
    console.log(`[AdaptiveQuiz] ✅ ${questionDocs.length} questions inserted | quizId="${createdQuiz._id}"`);
  } catch (err) {
    // Cleanup created quiz if question insertion failed
    console.error(`[AdaptiveQuiz] ❌ Question insertion failed, rolling back quiz "${createdQuiz._id}":`, err);
    await Quiz.findByIdAndDelete(createdQuiz._id);
    throw new AppError(`Failed to create quiz questions: ${err instanceof Error ? err.message : 'Unknown error'}`, 500);
  }

  console.log(`[AdaptiveQuiz] 🏁 Complete | quizId="${createdQuiz._id}" | employeeId="${params.employeeId}"`);
  return { quizId: createdQuiz._id.toString() };
};
