import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Campaign } from '../src/models/Campaign.js';
import SimulationResult from '../src/models/SimulationResult.js';
import { Leaderboard } from '../src/models/Leaderboard.js';
import { MembershipPlan } from '../src/models/MembershipPlan.js';
import { UserGame } from '../src/models/UserGame.js';
import { UserVideo } from '../src/models/UserVideo.js';
import { UserQuiz } from '../src/models/UserQuiz.js';
import { recalculateUserRisk } from '../src/services/analyticsService.js';

dotenv.config();

const seedAuradevFlow = async () => {
  try {
    console.log('🚀 Connecting to DB...');
    await connectDB();

    const targetEmail = 'auradev@company.com';
    const passwordHash = await bcryptjs.hash('password123', 10);

    // 1. Setup Membership Plan
    let plan = await MembershipPlan.findOne({ name: 'Enterprise Premium' });
    if (!plan) {
      plan = await MembershipPlan.create({
        name: 'Enterprise Premium',
        price: 999,
        features: ['All Campaigns', 'All Videos', 'All Games', 'Advanced Analytics'],
        maxEmployees: 10000,
        isActive: true,
      });
      console.log('💎 Created Enterprise Premium Plan');
    }

    // 2. Find or create auradev@company.com
    let admin = await User.findOne({ email: targetEmail });
    if (!admin) {
      admin = await User.create({
        name: 'Aura Dev',
        email: targetEmail,
        passwordHash,
        role: 'admin',
        department: 'Management',
      });
      console.log(`👤 Created user ${targetEmail}`);
    } else {
      admin.role = 'admin';
      await admin.save();
      console.log(`👤 Updated ${targetEmail} to admin`);
    }

    // 3. Create Company
  
    const company = await Company.create({
      companyName: 'Aura Enterprises',
      industry: 'Technology',
      adminId: admin._id,
      approvalStatus: 'approved',
      subscriptionPlan: plan._id,
      employeeCount: 15,
    });
    console.log(`🏢 Created Company: ${company.companyName}`);

    admin.companyId = company._id;
    await admin.save();

    // 4. Create 15 Employees
    console.log('👥 Creating 15 employees...');
  
    const employees = [];
    const departments = ['HR', 'IT', 'Finance', 'Engineering', 'Marketing'];
    for (let i = 1; i <= 15; i++) {
      const emp = await User.create({
        name: `Employee ${i}`,
        email: `emp${i}@auraenterprises.com`,
        passwordHash,
        role: 'employee',
        companyId: company._id,
        department: departments[i % departments.length],
        points: Math.floor(Math.random() * 800),
        badge: 'Security Learner',
      });
      employees.push(emp);
    }

    // 5. Create Campaigns
    console.log('📢 Creating Campaigns...');
    const campaigns = [];
    for (let i = 1; i <= 3; i++) {
      const type = ['phishing', 'smishing', 'vishing'][i % 3];
      const camp = await Campaign.create({
        campaignName: `Aura ${type} Test ${i}`,
        type: type,
        createdBy: admin._id,
        companyId: company._id,
        description: `Premium simulation campaign ${i}`,
        status: 'completed',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        targetCount: 15,
        completedCount: 15,
      });
      campaigns.push(camp);
    }

    // 6. Create Simulation Results
    console.log('📊 Creating Simulation Results & calculating risk...');
 
    for (const emp of employees) {
      for (const camp of campaigns) {
        // Randomize outcomes
        const isClicked = Math.random() > 0.6;
        const isCompromised = isClicked && Math.random() > 0.5;
        const isReported = !isClicked && Math.random() > 0.5;

        const createdAt = new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000);
        const reportedAt = isReported ? new Date(createdAt.getTime() + Math.random() * 3600000) : null;
        
        await SimulationResult.create({
          userId: emp._id,
          campaignId: camp._id,
          simulationType: camp.type,
          emailOpened: camp.type === 'phishing' ? true : false,
          linkClicked: camp.type === 'phishing' ? isClicked : false,
          smsSent: camp.type === 'smishing' ? true : false,
          smsDelivered: camp.type === 'smishing' ? true : false,
          smsLinkClicked: camp.type === 'smishing' ? isClicked : false,
          callInitiated: camp.type === 'vishing' ? true : false,
          callAnswered: camp.type === 'vishing' ? true : false,
          voiceEngaged: camp.type === 'vishing' ? isClicked : false,
          credentialsSubmitted: isCompromised,
          reportedPhishing: camp.type === 'phishing' ? isReported : false,
          voiceReported: camp.type === 'vishing' ? isReported : false,
          createdAt,
          smsSentAt: camp.type === 'smishing' ? createdAt : null,
          callInitiatedAt: camp.type === 'vishing' ? createdAt : null,
          reportedAt,
        });
      }
      
      // Calculate risk using the new Enterprise Risk Engine!
      await recalculateUserRisk(emp._id.toString());
    }

    // 7. Seed Premium Features Data (Videos, Games, Quizzes)
    console.log('🎮 Seeding Premium Activity Data (Videos, Games, Quizzes)...');
    for (const emp of employees) {
      // Mock game
      await UserGame.create({
        userId: emp._id,
        gameId: new mongoose.Types.ObjectId(), // mock id
        score: Math.floor(Math.random() * 100),
        companyId: company._id,
      });

      // Mock video
      await UserVideo.create({
        userId: emp._id,
        videoId: new mongoose.Types.ObjectId(), // mock id
        status: 'Completed',
        watchedAt: new Date(),
        companyId: company._id,
      });

      // Mock quiz
      await UserQuiz.create({
        userId: emp._id,
        quizId: new mongoose.Types.ObjectId(), // mock id
        score: Math.floor(Math.random() * 10) + 1,
        totalQuestions: 10,
        companyId: company._id,
      });
    }

    // 8. Create Leaderboard Entries
    console.log('🏆 Updating Leaderboard...');
  
    const sorted = [...employees].sort((a, b) => b.points - a.points);
    for (let i = 0; i < sorted.length; i++) {
      await Leaderboard.create({
        userId: sorted[i]._id,
        companyId: company._id,
        department: sorted[i].department,
        score: sorted[i].points,
        rank: i + 1,
      });
    }

    console.log('✅ Flow setup complete! You can now login with auradev@company.com');
  } catch (error) {
    console.error('❌ Error during seed:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

seedAuradevFlow();
