/**
 * pointsAudit.test.ts — Points Calculation & Audit Tests
 *
 * Tests:
 * 1. updateUserPoints correctly awards points for quiz completion
 * 2. Points differ by quiz score bracket
 * 3. Negative actions (click) do not increase points
 * 4. Report action awards positive points
 * 5. Badge is assigned after points update
 */
import mongoose from 'mongoose';
import {
  connectTestDB,
  disconnectTestDB,
  cleanupTestData,
  createTestCompany,
  createTestUser,
  TestUser,
} from './helpers.js';
import { User } from '../src/models/User.js';

let updateUserPoints: any;

beforeAll(async () => {
  await connectTestDB();
  const analyticsModule = await import('../src/services/analyticsService.js');
  updateUserPoints = analyticsModule.updateUserPoints;
});

afterAll(async () => {
  await cleanupTestData(['users', 'companies', 'userquizzes', 'usergames']);
  await disconnectTestDB();
});

describe('Points Audit — Quiz & Action Point Calculations', () => {
  let employee: TestUser;

  beforeAll(async () => {
    await cleanupTestData(['users', 'companies']);

    const company = await createTestCompany('Points Audit Corp');
    employee = await createTestUser({
      name: 'Points Test Employee',
      email: 'points-test@corp.com',
      role: 'employee',
      companyId: company._id,
    });
  });

  // 1. Quiz completion with high score awards points
  test('updateUserPoints("quiz_90") increases user points', async () => {
    const userBefore = await User.findById(employee._id).lean();
    const pointsBefore = (userBefore as any)?.points ?? 0;

    await updateUserPoints(employee._id.toString(), 'quiz_90');

    const userAfter = await User.findById(employee._id).lean();
    const pointsAfter = (userAfter as any)?.points ?? 0;

    console.log(
      `[pointsAudit.test] quiz_90: before=${pointsBefore} after=${pointsAfter}`
    );
    expect(pointsAfter).toBeGreaterThan(pointsBefore);
  });

  // 2. High score vs low score
  test('updateUserPoints("quiz_90") awards more or equal points compared to lower tier', async () => {
    const company2 = await createTestCompany('Points Audit Corp 2');
    const emp90 = await createTestUser({
      name: 'High Scorer',
      email: 'high-scorer@corp.com',
      role: 'employee',
      companyId: company2._id,
    });
    const emp40 = await createTestUser({
      name: 'Low Scorer',
      email: 'low-scorer@corp.com',
      role: 'employee',
      companyId: company2._id,
    });

    await updateUserPoints(emp90._id.toString(), 'quiz_90');
    await updateUserPoints(emp40._id.toString(), 'quiz_40');

    const user90 = (await User.findById(emp90._id).lean()) as any;
    const user40 = (await User.findById(emp40._id).lean()) as any;

    console.log(
      `[pointsAudit.test] quiz_90 points=${user90?.points}, quiz_40 points=${user40?.points}`
    );
    expect(user90.points).toBeGreaterThanOrEqual(user40.points);
  });

  // 3. Negative actions do not increase points
  test('updateUserPoints("click") does not increase points above starting value', async () => {
    const company3 = await createTestCompany('Points Audit Corp 3');
    const emp = await createTestUser({
      name: 'Click Employee',
      email: 'click-test@corp.com',
      role: 'employee',
      companyId: company3._id,
    });

    const before = ((await User.findById(emp._id).lean()) as any)?.points ?? 0;
    await updateUserPoints(emp._id.toString(), 'click');
    const after = ((await User.findById(emp._id).lean()) as any)?.points ?? 0;

    console.log(`[pointsAudit.test] click: before=${before} after=${after}`);
    expect(after).toBeLessThanOrEqual(before);
  });

  // 4. Report action awards positive points
  test('updateUserPoints("report") awards positive points', async () => {
    const company4 = await createTestCompany('Points Audit Corp 4');
    const emp = await createTestUser({
      name: 'Reporter Employee',
      email: 'report-test@corp.com',
      role: 'employee',
      companyId: company4._id,
    });

    const before = ((await User.findById(emp._id).lean()) as any)?.points ?? 0;
    await updateUserPoints(emp._id.toString(), 'report');
    const after = ((await User.findById(emp._id).lean()) as any)?.points ?? 0;

    console.log(`[pointsAudit.test] report: before=${before} after=${after}`);
    expect(after).toBeGreaterThan(before);
  });

  // 5. Badge is assigned after points update
  test('User has a badge field after points update', async () => {
    const user = (await User.findById(employee._id).lean()) as any;
    expect(user.badge).toBeDefined();
    expect(typeof user.badge).toBe('string');
  });
});
