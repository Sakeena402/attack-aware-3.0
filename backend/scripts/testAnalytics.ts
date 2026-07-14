import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { computeDashboardStats, computeSimulationAnalytics, computeDepartmentRisk } from '../src/services/analyticsService.js';
import { User } from '../src/models/User.js';

dotenv.config();

async function test() {
  await connectDB();
  const admin = await User.findOne({ email: 'auradev@company.com' });
  console.log('Admin companyId:', admin?.companyId);
  if (admin?.companyId) {
    const employees = await User.find({ companyId: admin.companyId, role: 'employee' }).select('email riskScore riskLevel').lean();
    console.log('Employees in DB:', employees);
    const dash = await computeDashboardStats(admin.companyId.toString(), 'all');
    console.log('Dashboard:', JSON.stringify(dash, null, 2));
    const sims = await computeSimulationAnalytics(admin.companyId.toString(), 'all');
    console.log('Simulations:', JSON.stringify(sims, null, 2));
    const depts = await computeDepartmentRisk(admin.companyId.toString(), 'all');
    console.log('Departments:', JSON.stringify(depts, null, 2));
  }
  await disconnectDB();
  process.exit(0);
}
test();
