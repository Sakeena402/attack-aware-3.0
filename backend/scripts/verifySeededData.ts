import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Campaign } from '../src/models/Campaign.js';
import SimulationResult from '../src/models/SimulationResult.js';
import { MembershipPlan } from '../src/models/MembershipPlan.js';

dotenv.config();

const verifySeededData = async () => {
  try {
    console.log('🔍 Connecting to database to verify seeded data...');
    await connectDB();

    // Get counts
    const [
      totalUsers,
      totalCompanies, 
      totalCampaigns,
      totalSimulations,
      totalPlans,
      admins,
      employees,
      superAdmins
    ] = await Promise.all([
      User.countDocuments({}),
      Company.countDocuments({}),
      Campaign.countDocuments({}),
      SimulationResult.countDocuments({}),
      MembershipPlan.countDocuments({}),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'employee' }),
      User.countDocuments({ role: 'super_admin' })
    ]);

    console.log('\n📊 SEEDED DATA SUMMARY:');
    console.log('═══════════════════════════════════════════════');
    console.log(`👥 Total Users: ${totalUsers}`);
    console.log(`   - Super Admins: ${superAdmins}`);
    console.log(`   - Company Admins: ${admins}`);
    console.log(`   - Employees: ${employees}`);
    console.log(`🏢 Total Companies: ${totalCompanies}`);
    console.log(`📢 Total Campaigns: ${totalCampaigns}`);
    console.log(`📊 Total Simulations: ${totalSimulations}`);
    console.log(`💎 Membership Plans: ${totalPlans}`);

    // Get companies with their details
    const companies = await Company.find({})
      .populate('adminId', 'name email')
      .populate('subscriptionPlan', 'name')
      .sort({ companyName: 1 });

    console.log('\n🏢 COMPANY DETAILS:');
    console.log('═══════════════════════════════════════════════');
    for (const company of companies) {
      const employeeCount = await User.countDocuments({ 
        companyId: company._id, 
        role: 'employee' 
      });
      
      const campaignCount = await Campaign.countDocuments({ 
        companyId: company._id 
      });

      const admin = company.adminId as any;
      const plan = company.subscriptionPlan as any;
      
      console.log(`🏢 ${company.companyName}`);
      console.log(`   Admin: ${admin?.name} (${admin?.email})`);
      console.log(`   Industry: ${company.industry}`);
      console.log(`   Plan: ${plan?.name || 'None'}`);
      console.log(`   Employees: ${employeeCount}`);
      console.log(`   Campaigns: ${campaignCount}`);
      console.log(`   Status: ${company.approvalStatus}`);
      console.log('');
    }

    // Sample employee emails
    const sampleEmployees = await User.find({ role: 'employee' })
      .select('name email department companyId')
      .populate('companyId', 'companyName')
      .limit(10);

    console.log('\n👥 SAMPLE EMPLOYEE LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════');
    console.log('Password for all users: password123');
    console.log('');
    
    for (const emp of sampleEmployees) {
      const company = emp.companyId as any;
      console.log(`📧 ${emp.email}`);
      console.log(`   Name: ${emp.name}`);
      console.log(`   Company: ${company?.companyName}`);
      console.log(`   Department: ${emp.department}`);
      console.log('');
    }

    console.log('\n🎯 QUICK LOGIN GUIDE:');
    console.log('═══════════════════════════════════════════════');
    console.log('🔑 Super Admin: admin@attackaware.com');
    console.log('🔑 Admin Examples:');
    for (let i = 1; i <= Math.min(5, companies.length); i++) {
      console.log(`   admin${i}@company${i}.com`);
    }

  } catch (error) {
    console.error('❌ Verification Error:', error);
  } finally {
    await disconnectDB();
  }
};

verifySeededData();