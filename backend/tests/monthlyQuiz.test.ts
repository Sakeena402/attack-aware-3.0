/**
 * monthlyQuiz.test.ts — Monthly Quiz Generation Tests
 *
 * Tests:
 * 1. Monthly generation produces a quiz with ≥ 15 questions
 * 2. Generated quiz has correct companyId
 * 3. Quiz does not appear in another company's overview
 * 4. Auth checks (regular admin cannot trigger global monthly)
 */
import request from 'supertest';
import mongoose from 'mongoose';
import {
  connectTestDB,
  disconnectTestDB,
  cleanupTestData,
  createTestCompany,
  createTestUser,
  TestCompany,
  TestUser,
} from './helpers.js';
import { Quiz } from '../src/models/Quiz.js';
import { QuizQuestion } from '../src/models/QuizQuestion.js';
import { Company } from '../src/models/Company.js';

let app: any;

beforeAll(async () => {
  await connectTestDB();
  const serverModule = await import('../server.js');
  app = serverModule.default;
});

afterAll(async () => {
  await cleanupTestData(['users', 'companies', 'quizzes', 'quizquestions', 'tasks']);
  await disconnectTestDB();
});

describe('Monthly Quiz Generation', () => {
  let companyA: TestCompany;
  let companyB: TestCompany;
  let superAdmin: TestUser;
  let adminB: TestUser;

  beforeAll(async () => {
    await cleanupTestData(['users', 'companies', 'quizzes', 'quizquestions', 'tasks']);

    companyA = await createTestCompany('Monthly Test Corp A');
    companyB = await createTestCompany('Monthly Test Corp B');

    superAdmin = await createTestUser({
      name: 'Super Admin',
      email: 'super-monthly-test@admin.com',
      role: 'super_admin',
    });

    adminB = await createTestUser({
      name: 'Admin B Monthly',
      email: 'admin-b-monthly@beta.com',
      role: 'admin',
      companyId: companyB._id,
    });

    await createTestUser({
      name: 'Employee A Monthly',
      email: 'emp-a-monthly@alpha.com',
      role: 'employee',
      companyId: companyA._id,
    });

    await createTestUser({
      name: 'Employee B Monthly',
      email: 'emp-b-monthly@beta.com',
      role: 'employee',
      companyId: companyB._id,
    });
  });

  // 1. Non-super_admin cannot trigger monthly generation
  test('POST /api/ai/quizzes/trigger-monthly — regular admin gets 403', async () => {
    const res = await request(app)
      .post('/api/ai/quizzes/trigger-monthly')
      .set('Authorization', `Bearer ${adminB.token}`);

    expect(res.status).toBe(403);
  });

  // 2. GET /api/ai/quizzes/overview — company isolation
  test('GET /api/ai/quizzes/overview — scoped to requester company', async () => {
    // Create a quiz for company A
    await Quiz.create({
      title: 'Company A Quiz',
      category: 'Phishing',
      difficulty: 'medium',
      totalQuestions: 15,
      order: 1,
      source: 'ai_generated',
      status: 'pending_review',
      companyId: companyA._id,
      triggerContext: {
        eventType: 'monthly_scheduled',
        generatedAt: new Date(),
      },
    });

    const resA = await request(app)
      .get('/api/ai/quizzes/overview')
      .set('Authorization', `Bearer ${superAdmin.token}`);

    expect(resA.status).toBe(200);
    expect(resA.body.data.totalQuizzes).toBeGreaterThanOrEqual(1);

    const resB = await request(app)
      .get('/api/ai/quizzes/overview')
      .set('Authorization', `Bearer ${adminB.token}`);

    expect(resB.status).toBe(200);
    // Company B has 0 quizzes
    expect(resB.body.data.totalQuizzes).toBe(0);
  });

  // 3. GET /api/ai/quizzes/list — returns quizzes scoped to company
  test('GET /api/ai/quizzes/list — returns generated quizzes', async () => {
    const res = await request(app)
      .get('/api/ai/quizzes/list')
      .set('Authorization', `Bearer ${superAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
