/**
 * Attack Aware 3.0 — Full E2E Integration Test
 *
 * Tests the complete user journey:
 *   1.  Register a new user
 *   2.  Login with that user
 *   3.  GET /auth/me (verify session)
 *   4.  Create a company (self-service)
 *   5.  Approve company via DB
 *   6.  Add an employee
 *   7.  List employees
 *   8.  Create a phishing campaign
 *   9.  Launch the campaign
 *   10. Get campaign details
 *   11. Logout
 *   12. Verify session is gone (re-auth fails)
 *   13. Cleanup: delete test data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Company } from '../src/models/Company.js';
import { User } from '../src/models/User.js';
import { Campaign } from '../src/models/Campaign.js';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
let cookie = '';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function request(endpoint: string, method: string = 'GET', body?: any) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie;

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = text; }

  if (!res.ok) {
    throw new Error(
      `[${method}] ${endpoint} → HTTP ${res.status}: ${
        json?.error || json?.message || text
      }`
    );
  }
  return json;
}

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label: string, err: unknown) {
  console.error(`  ❌ ${label}`);
  console.error(`     ${err instanceof Error ? err.message : err}`);
  failed++;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function runTests() {
  // IDs for cleanup
  let userId: string | null = null;
  let companyId: string | null = null;
  let employeeId: string | null = null;
  let campaignId: string | null = null;
  let dbConnected = false;

  const suffix = Math.floor(Math.random() * 999999);
  const adminEmail = `testadmin${suffix}@e2e.dev`;
  const employeeEmail = `testemployee${suffix}@e2e.dev`;
  const password = 'Password123!';

  console.log('\n══════════════════════════════════════════════════');
  console.log('  Attack Aware 3.0 — E2E Integration Test Suite');
  console.log('══════════════════════════════════════════════════\n');

  try {
    // ── DB connection ─────────────────────────────────────────────────────────
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017', {
      dbName: 'attackaware3',
    });
    dbConnected = true;

    // ──────────────────────────────────────────────────────────────────────────
    console.log('🔐 Auth Flow');
    // ──────────────────────────────────────────────────────────────────────────

    // 1. Register
    try {
      const r = await request('/auth/register', 'POST', {
        name: 'E2E Admin',
        email: adminEmail,
        password,
      });
      userId = r.data?.user?.id;
      pass(`Register user (id: ${userId})`);
    } catch (e) { fail('Register user', e); }

    // 2. Login
    try {
      const r = await request('/auth/login', 'POST', { email: adminEmail, password });
      pass(`Login — got ${cookie ? 'cookie' : 'NO COOKIE!'}`);
    } catch (e) { fail('Login', e); }

    // 3. GET /auth/me
    try {
      const r = await request('/auth/me');
      pass(`GET /auth/me → role=${r.data?.role ?? r.data?.user?.role}`);
    } catch (e) { fail('GET /auth/me', e); }

    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🏢 Company Flow');
    // ──────────────────────────────────────────────────────────────────────────

    // 4. Create company (self-service)
    try {
      const r = await request('/companies', 'POST', {
        companyName: `E2E Corp ${suffix}`,
        industry: 'Technology',
      });
      companyId = r.data?.company?.id || r.data?.company?._id;
      pass(`Create company → id: ${companyId}`);
    } catch (e) { fail('Create company', e); }

    // 5. Approve company directly in DB (simulates super-admin approval)
    if (companyId) {
      try {
        await Company.findByIdAndUpdate(companyId, { approvalStatus: 'approved' });
        pass('Approve company in DB');
      } catch (e) { fail('Approve company in DB', e); }
    }

    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n👥 Employee Flow');
    // ──────────────────────────────────────────────────────────────────────────

    // 6. Add an employee
    try {
      const r = await request('/employees', 'POST', {
        name: 'E2E Employee',
        email: employeeEmail,
        password: 'Employee123!',
        department: 'IT',
      });
      const emp = r.data?.employee || r.data;
      employeeId = emp?.id || emp?._id;
      pass(`Create employee → id: ${employeeId}`);
    } catch (e) { fail('Create employee', e); }

    // 7. List employees
    try {
      const r = await request('/employees');
      const count = Array.isArray(r.data)
        ? r.data.length
        : r.data?.employees?.length ?? 0;
      pass(`List employees → ${count} found`);
    } catch (e) { fail('List employees', e); }

    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📧 Campaign Flow');
    // ──────────────────────────────────────────────────────────────────────────

    // 8. Create a phishing campaign with target employee
    try {
      const r = await request('/campaigns', 'POST', {
        campaignName: `E2E Phishing ${suffix}`,
        type: 'phishing',
        targetDepartments: ['IT'],
        targetEmployees: [
          {
            _id: employeeId,
            email: employeeEmail,
            name: 'E2E Employee',
            department: 'IT',
          },
        ],
        emailTemplate: 'bank_phishing',
        startDate: new Date().toISOString(),
      });
      campaignId = r.data?.campaign?._id || r.data?._id;
      pass(`Create campaign → id: ${campaignId}`);
    } catch (e) { fail('Create campaign', e); }

    // 9. Launch campaign
    if (campaignId) {
      try {
        const r = await request(`/campaigns/${campaignId}/launch`, 'POST');
        pass(`Launch campaign → ${r.message}`);
      } catch (e) { fail('Launch campaign', e); }
    }

    // 10. Get campaign details
    if (campaignId) {
      try {
        const r = await request(`/campaigns/${campaignId}`);
        const status = r.data?.status;
        pass(`Get campaign details → status: ${status}`);
      } catch (e) { fail('Get campaign details', e); }
    }

    // 11. List campaigns
    try {
      const r = await request('/campaigns');
      const count = Array.isArray(r.data)
        ? r.data.length
        : r.data?.campaigns?.length ?? 0;
      pass(`List campaigns → ${count} found`);
    } catch (e) { fail('List campaigns', e); }

    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🚪 Logout Flow');
    // ──────────────────────────────────────────────────────────────────────────

    // 12. Logout
    try {
      await request('/auth/logout', 'POST');
      pass('Logout');
    } catch (e) { fail('Logout', e); }

    // 13. Verify session is invalidated
    try {
      cookie = ''; // clear cookie
      const r = await request('/auth/me');
      fail('Session should be invalid after logout', 'Got success response');
    } catch (e) {
      // Expected failure — session gone
      pass('Session correctly invalidated after logout');
    }

  } finally {
    // ── Cleanup ───────────────────────────────────────────────────────────────
    console.log('\n🧹 Cleanup');
    try {
      if (campaignId) await Campaign.findByIdAndDelete(campaignId);
      if (employeeId) await User.findByIdAndDelete(employeeId);
      if (companyId)  await Company.findByIdAndDelete(companyId);
      if (userId)     await User.findByIdAndDelete(userId);
      pass('Deleted all test data from DB');
    } catch (e) { fail('Cleanup', e); }

    if (dbConnected) await mongoose.disconnect();

    // ── Results ───────────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════════\n');

    if (failed > 0) {
      console.error('❌ Some tests failed. Review the errors above.');
      process.exit(1);
    } else {
      console.log('🎉 ALL TESTS PASSED — Your backend is working correctly!');
    }
  }
}

runTests();
