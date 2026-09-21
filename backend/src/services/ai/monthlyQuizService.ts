import { Company } from '../../models/Company.js';
import { Quiz } from '../../models/Quiz.js';
import { QuizQuestion } from '../../models/QuizQuestion.js';
import { Task } from '../../models/Task.js';
import { User } from '../../models/User.js';
import { aiService } from './aiService.js';
import { getNextQuizTopic } from './quizTopics.js';
import {
  quizPayloadZodSchema,
  quizResponseSchema,
  GeneratedQuizPayload,
} from './adaptiveQuizService.js';

export const DEFAULT_QUIZ_DUE_DAYS = parseInt(process.env.DEFAULT_QUIZ_DUE_DAYS || '14', 10);

export interface MonthlyQuizGenerationResult {
  successfulCompanies: number;
  failedCompanies: number;
  results: Array<{
    companyId: string;
    companyName: string;
    success: boolean;
    quizId?: string;
    topic?: string;
    taskCount?: number;
    error?: string;
  }>;
}

export const runMonthlyQuizGeneration = async (
  dueInDays: number = DEFAULT_QUIZ_DUE_DAYS
): Promise<MonthlyQuizGenerationResult> => {
  const companies = await Company.find();
  const summary: MonthlyQuizGenerationResult = {
    successfulCompanies: 0,
    failedCompanies: 0,
    results: [],
  };

  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-09"

  console.log(
    `[MonthlyQuiz] 🗓️  Starting monthly quiz generation | month="${currentMonth}" | companyCount=${companies.length} | dueInDays=${dueInDays}`
  );

  for (const company of companies) {
    const companyIdStr = company._id.toString();

    console.log(`[MonthlyQuiz] 🏢 Processing company="${company.companyName}" (${companyIdStr})`);

    try {
      const topic = getNextQuizTopic(company.lastMonthlyQuizTopic);
      console.log(
        `[MonthlyQuiz] 📖 Topic selected="${topic}" | prevTopic="${company.lastMonthlyQuizTopic ?? 'none'}"`
      );

      const systemPrompt = `You are an expert corporate cybersecurity training specialist.
Generate a general monthly security awareness quiz on the topic "${topic}" suitable for all employees in a company (Industry: ${company.industry || 'General'}).
Generate 4 multiple-choice questions focusing on practical awareness, best practices, and threat detection for "${topic}".
Output valid JSON matching the requested schema strictly.`;

      const userPrompt = `Create a monthly security awareness quiz on the topic "${topic}".`;

      console.log(`[MonthlyQuiz] 🤖 Calling AI service for company="${company.companyName}"...`);
      const aiResult = await aiService.generateStructured<GeneratedQuizPayload>(
        {
          systemPrompt,
          userPrompt,
          responseSchema: quizResponseSchema,
          schema: quizPayloadZodSchema,
          maxTokens: 1600,
        },
        {
          purpose: 'monthly_quiz_generation',
          relatedEntityId: company._id,
        }
      );

      const payload = aiResult.data;
      console.log(
        `[MonthlyQuiz] ✅ AI quiz received | title="${payload.title}" | questions=${payload.questions.length}`
      );

      const createdQuiz = await Quiz.create({
        title: payload.title || `Monthly Security Quiz: ${topic}`,
        description: payload.description || `Monthly training assessment for ${topic}`,
        category: topic,
        difficulty: payload.difficulty || 'medium',
        totalQuestions: payload.questions.length,
        order: 999,
        source: 'ai_generated',
        triggerContext: {
          eventType: 'monthly_scheduled',
          topic,
          month: currentMonth,
          generatedAt: new Date(),
        },
      });

      console.log(`[MonthlyQuiz] 💾 Quiz saved | quizId="${createdQuiz._id}"`);

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
        console.log(`[MonthlyQuiz] ✅ ${questionDocs.length} questions inserted | quizId="${createdQuiz._id}"`);
      } catch (err) {
        console.error(`[MonthlyQuiz] ❌ Question insertion failed, rolling back quiz "${createdQuiz._id}":`, err);
        await Quiz.findByIdAndDelete(createdQuiz._id);
        throw err;
      }

      // Update company topic rotation state
      company.lastMonthlyQuizTopic = topic;
      company.lastMonthlyQuizGeneratedAt = new Date();
      await company.save();

      // Find all employees in company
      const employees = await User.find({
        companyId: company._id,
        role: { $in: ['employee', 'admin'] },
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueInDays);

      const taskDocs = employees.map((emp) => ({
        assignedTo: emp._id,
        assignedBy: company.adminId || emp._id,
        companyId: company._id,
        title: `Monthly Quiz: ${topic}`,
        description: `Complete your monthly cybersecurity awareness quiz on "${topic}".`,
        status: 'pending' as const,
        dueDate,
        contentType: 'quiz' as const,
        contentId: createdQuiz._id,
        points: 15,
      }));

      if (taskDocs.length > 0) {
        await Task.insertMany(taskDocs);
      }

      summary.successfulCompanies++;
      summary.results.push({
        companyId: companyIdStr,
        companyName: company.companyName,
        success: true,
        quizId: createdQuiz._id.toString(),
        topic,
        taskCount: taskDocs.length,
      });

      console.log(
        `[MonthlyQuiz] ✅ Done for company="${company.companyName}" | topic="${topic}" | tasksCreated=${taskDocs.length} | quizId="${createdQuiz._id}"`
      );
    } catch (err: unknown) {
      summary.failedCompanies++;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during quiz generation';
      summary.results.push({
        companyId: companyIdStr,
        companyName: company.companyName,
        success: false,
        error: errorMessage,
      });
      console.error(
        `[MonthlyQuiz] ❌ Failed for company="${company.companyName}": ${errorMessage}`
      );
    }
  }

  console.log(
    `[MonthlyQuiz] 🏁 Monthly run complete | succeeded=${summary.successfulCompanies} | failed=${summary.failedCompanies}`
  );

  return summary;
};
