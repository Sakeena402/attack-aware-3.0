/**
 * campaignQuiz.test.ts — Tenant Isolation Tests for AI Quiz Endpoints
 *
 * Tests:
 * 1. GET /api/ai/quizzes/:id/details — returns 404 for cross-company access
 * 2. POST /api/ai/quizzes/:id/retry  — returns 404 for cross-company access
 * 3. POST /api/ai/quizzes/:id/approve — returns 404 for cross-company access
 * 4. POST /api/ai/quizzes/:id/reject  — returns 404 for cross-company access
 * 5. POST /api/ai/quizzes/suggest-topic with cross-company employeeId
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

let app: any;

beforeAll(async () => {
  await connectTestDB();
  const serverModule = await import('../server.js');
  app = serverModule.default;
});

afterAll(async () => {
  await cleanupTestData(['users', 'companies', 'quizzes', 'quizquestions']);
  await disconnectTestDB();
});

describe('Tenant Isolation — AI Quiz Endpoints', () => {
  let companyA: TestCompany;
  let companyB: TestCompany;
  let adminA: TestUser;
  let adminB: TestUser;
  let quizInCompanyA: any;

  beforeAll(async () => {
    await cleanupTestData(['users', 'companies', 'quizzes']);

    companyA = await createTestCompany('Company Alpha (Test)');
    companyB = await createTestCompany('Company Beta (Test)');

    adminA = await createTestUser({
      name: 'Admin A',
      email: 'admin-a-test@alpha.com',
      role: 'admin',
      companyId: companyA._id,
    });

    adminB = await createTestUser({
      name: 'Admin B',
      email: 'admin-b-test@beta.com',
      role: 'admin',
      companyId: companyB._id,
    });

    quizInCompanyA = await Quiz.create({
      title: 'Test Campaign Quiz for Alpha',
      description: 'Tenant isolation test quiz',
      category: 'Phishing Awareness',
      difficulty: 'medium',
      totalQuestions: 15,
      order: 1,
      source: 'ai_generated',
      status: 'pending_review',
      companyId: companyA._id,
      triggerContext: {
        eventType: 'campaign_launch',
        topic: 'Phishing Awareness',
        generatedAt: new Date(),
      },
    });
  });

  // 1. GET /api/ai/quizzes/:id/details
  test('GET /api/ai/quizzes/:id/details — admin of same company gets 200', async () => {
    const res = await request(app)
      .get(`/api/ai/quizzes/${quizInCompanyA._id}/details`)
      .set('Authorization', `Bearer ${adminA.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id.toString()).toBe(quizInCompanyA._id.toString());
  });

  test('GET /api/ai/quizzes/:id/details — admin of DIFFERENT company gets 404', async () => {
    const res = await request(app)
      .get(`/api/ai/quizzes/${quizInCompanyA._id}/details`)
      .set('Authorization', `Bearer ${adminB.token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 2. POST /api/ai/quizzes/:id/retry
  test('POST /api/ai/quizzes/:id/retry — cross-company gets 404', async () => {
    const res = await request(app)
      .post(`/api/ai/quizzes/${quizInCompanyA._id}/retry`)
      .set('Authorization', `Bearer ${adminB.token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 3. POST /api/ai/quizzes/:id/approve
  test('POST /api/ai/quizzes/:id/approve — cross-company gets 404', async () => {
    const res = await request(app)
      .post(`/api/ai/quizzes/${quizInCompanyA._id}/approve`)
      .set('Authorization', `Bearer ${adminB.token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 4. POST /api/ai/quizzes/:id/reject
  test('POST /api/ai/quizzes/:id/reject — cross-company gets 404', async () => {
    const res = await request(app)
      .post(`/api/ai/quizzes/${quizInCompanyA._id}/reject`)
      .set('Authorization', `Bearer ${adminB.token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 5. Suggest topic — cross-company employee should fail
  test('POST /api/ai/quizzes/suggest-topic — cross-company employeeId blocked', async () => {
    const employeeA = await createTestUser({
      name: 'Employee Alpha',
      email: 'emp-a-test@alpha.com',
      role: 'employee',
      companyId: companyA._id,
    });

    const res = await request(app)
      .post('/api/ai/quizzes/suggest-topic')
      .set('Authorization', `Bearer ${adminB.token}`)
      .send({
        employeeId: employeeA._id.toString(),
      });

    expect([403, 404]).toContain(res.status);
  });

  // 6. Non-existent quiz ID returns 404
  test('GET /api/ai/quizzes/:id/details — non-existent ID returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/ai/quizzes/${fakeId}/details`)
      .set('Authorization', `Bearer ${adminA.token}`);

    expect(res.status).toBe(404);
  });
});
