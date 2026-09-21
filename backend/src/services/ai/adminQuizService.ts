import { Types } from 'mongoose';
import { Quiz } from '../../models/Quiz.js';
import { QuizQuestion } from '../../models/QuizQuestion.js';
import { User } from '../../models/User.js';
import { UserQuiz } from '../../models/UserQuiz.js';
import { Task } from '../../models/Task.js';
import { Message } from '../../models/Message.js';
import { aiService } from './aiService.js';
import { QuizTopic } from './quizTopics.js';
import {
  quizPayloadZodSchema,
  quizResponseSchema,
  GeneratedQuizPayload,
} from './adaptiveQuizService.js';
import { AppError } from '../../utils/errorHandler.js';

export interface AdminQuizJobPayload {
  companyId: string;
  employeeId: string;
  requestedBy: string;
  topicMode: 'manual' | 'auto';
  topic?: QuizTopic;
  dueInDays?: number;
}

export const generateAdminQuiz = async (
  payload: AdminQuizJobPayload
): Promise<{ quizId: string; taskId: string }> => {
  const employeeObjectId = new Types.ObjectId(payload.employeeId);
  const requestedByObjectId = new Types.ObjectId(payload.requestedBy);
  const companyObjectId = new Types.ObjectId(payload.companyId);

  console.log(
    `[AdminQuiz] 🚦 Job started | employeeId="${payload.employeeId}" | requestedBy="${payload.requestedBy}" | topicMode="${payload.topicMode}" | topic="${payload.topic ?? 'auto'}"`
  );

  const employee = await User.findById(employeeObjectId);
  if (!employee) {
    throw new AppError('Assigned employee not found', 404);
  }

  console.log(`[AdminQuiz] 👤 Employee resolved: "${employee.name}" (${employee.department ?? 'no dept'})`);

  const dueInDays = payload.dueInDays && payload.dueInDays > 0 ? payload.dueInDays : 14;

  let topicName = payload.topic || 'Security Awareness';
  let systemPrompt = '';
  let userPrompt = '';

  if (payload.topicMode === 'manual' && payload.topic) {
    topicName = payload.topic;
    systemPrompt = `You are an expert corporate security awareness trainer.
Generate a targeted security awareness quiz for employee "${employee.name}" on the explicit topic "${topicName}".
Generate 4 multiple-choice questions testing practical awareness, threat identification, and defensive response for "${topicName}".
Output valid JSON matching the requested schema strictly.`;

    userPrompt = `Create a quiz on topic "${topicName}" for employee ${employee.name}.`;
    console.log(`[AdminQuiz] 📝 Manual topic mode | topic="${topicName}"`);
  } else {
    // topicMode === 'auto': infer weak areas from recent quiz history
    const recentQuizzes = await UserQuiz.find({ userId: employeeObjectId })
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
      `[AdminQuiz] 🤖 Auto topic mode | pastQuizzes=${totalQuizzesPlayed} | avgScore=${avgScore}% for "${employee.name}"`
    );

    systemPrompt = `You are an AI cybersecurity training instructor.
Generate a personalized adaptive quiz for employee "${employee.name}" (Department: ${employee.department || 'General'}).
Employee Performance Context: ${totalQuizzesPlayed} past quizzes completed, average score: ${avgScore}%.
Analyze typical cybersecurity risk areas and generate 4 multiple-choice questions addressing key weak areas or core security hygiene.
Output valid JSON matching the requested schema strictly.`;

    userPrompt = `Create an AI-decided adaptive quiz for employee ${employee.name}.`;
  }

  try {
    console.log(`[AdminQuiz] 🤖 Calling AI service | employee="${employee.name}" | topic="${topicName}"...`);
    const aiResult = await aiService.generateStructured<GeneratedQuizPayload>(
      {
        systemPrompt,
        userPrompt,
        responseSchema: quizResponseSchema,
        schema: quizPayloadZodSchema,
        maxTokens: 1600,
      },
      {
        purpose: 'admin_triggered_quiz_generation',
        relatedEntityId: employeeObjectId,
      }
    );

    const generated = aiResult.data;
    console.log(
      `[AdminQuiz] ✅ AI quiz received | title="${generated.title}" | questions=${generated.questions.length} | difficulty="${generated.difficulty}"`
    );

    const createdQuiz = await Quiz.create({
      title: generated.title || `Assigned Quiz: ${topicName}`,
      description: generated.description || `Admin assigned training quiz for ${employee.name}`,
      category: generated.category || topicName,
      difficulty: generated.difficulty || 'medium',
      totalQuestions: generated.questions.length,
      order: 999,
      source: 'ai_generated',
      triggerContext: {
        eventType: 'admin_manual',
        topic: topicName,
        employeeId: employeeObjectId,
        requestedBy: requestedByObjectId,
        generatedAt: new Date(),
      },
    });

    console.log(`[AdminQuiz] 💾 Quiz saved | quizId="${createdQuiz._id}"`);

    try {
      const questionDocs = generated.questions.map((q) => ({
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
      console.log(`[AdminQuiz] ✅ ${questionDocs.length} questions inserted | quizId="${createdQuiz._id}"`);
    } catch (err) {
      console.error(`[AdminQuiz] ❌ Question insertion failed, rolling back quiz "${createdQuiz._id}":`, err);
      await Quiz.findByIdAndDelete(createdQuiz._id);
      throw err;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);

    const createdTask = await Task.create({
      assignedTo: employeeObjectId,
      assignedBy: requestedByObjectId,
      companyId: companyObjectId,
      title: `Assigned Quiz: ${createdQuiz.title}`,
      description: createdQuiz.description,
      status: 'pending',
      dueDate,
      contentType: 'quiz',
      contentId: createdQuiz._id,
      points: 15,
    });

    console.log(`[AdminQuiz] 📋 Task created | taskId="${createdTask._id}" | dueDate="${dueDate.toISOString()}"`);

    // Notify requesting admin via Message model
    await Message.create({
      senderId: requestedByObjectId,
      receiverId: requestedByObjectId,
      companyId: companyObjectId,
      content: `Quiz Generated & Assigned: "${createdQuiz.title}" (Topic: ${topicName}) has been successfully created and assigned to ${employee.name}.`,
      isRead: false,
    });

    console.log(
      `[AdminQuiz] 🔔 Success notification sent to requestedBy="${payload.requestedBy}" | quizId="${createdQuiz._id}" | taskId="${createdTask._id}"`
    );

    return {
      quizId: createdQuiz._id.toString(),
      taskId: createdTask._id.toString(),
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown generation failure';
    console.error(`[AdminQuiz] ❌ Generation failed for employee="${employee.name}": ${errorMessage}`);
    // Notify requesting admin of failure
    try {
      await Message.create({
        senderId: requestedByObjectId,
        receiverId: requestedByObjectId,
        companyId: companyObjectId,
        content: `Quiz Generation Failed for ${employee.name} (Topic: ${topicName}): ${errorMessage}`,
        isRead: false,
      });
      console.log(`[AdminQuiz] 🔔 Failure notification sent to requestedBy="${payload.requestedBy}"`);
    } catch (msgErr) {
      console.error('[AdminQuiz] Failed to send failure notification message:', msgErr);
    }
    throw err;
  }
};
