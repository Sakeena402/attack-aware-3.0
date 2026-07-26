// import dotenv from 'dotenv';
// import bcryptjs from 'bcryptjs';
// import { connectDB, disconnectDB } from '../src/config/database.js';
// import { User } from '../src/models/User.js';
// import { Company } from '../src/models/Company.js';
// import { Campaign } from '../src/models/Campaign.js';
// import  SimulationResult  from '../src/models/SimulationResult.js';
// import { Leaderboard } from '../src/models/Leaderboard.js';

// dotenv.config();

// const seedDatabase = async (): Promise<void> => {
//   try {
//     console.log('[v0] Connecting to database...');
//     await connectDB();

//     // Create users
//     console.log('[v0] Creating users...');
//     const passwordHash = await bcryptjs.hash('password123', 10);

//     // Clear existing data
//     console.log('[v0] Clearing existing data...');
//     await User.deleteMany({});
//     await Company.deleteMany({});
//     await Campaign.deleteMany({});
//     await SimulationResult.deleteMany({});
//     await Leaderboard.deleteMany({});

//     const admin1 = await User.create({
//       name: 'John Admin',
//       email: 'admin1@techcorp.com',
//       passwordHash,
//       role: 'admin',
//       department: 'Security',
//     });

//     const admin2 = await User.create({
//       name: 'Jane Admin',
//       email: 'admin2@finance.com',
//       passwordHash,
//       role: 'admin',
     
//       department: 'Security',
//     });

//     // Create companies
//     console.log('[v0] Creating companies...');
//     const company1 = await Company.create({
//       companyName: 'TechCorp Inc',
//       industry: 'Technology',
//       adminId: admin1._id,
//     });

//     const company2 = await Company.create({
//       companyName: 'Finance Solutions Ltd',
//       industry: 'Finance',
//       adminId: admin2._id,
//     });

//     const superAdmin = await User.create({
//       name: 'Super Admin',
//       email: 'admin@cyberaware.com',
//       passwordHash,
//       role: 'super_admin',
//       department: 'Management',
//     });

    
//     // Update company admin references
//     company1.adminId = admin1._id;
//     await company1.save();

//     company2.adminId = admin2._id;
//     await company2.save();

//     // Create employees
//     const employees = [];
//     const employeeNames = [
//       { name: 'Alice Johnson', department: 'HR' },
//       { name: 'Bob Smith', department: 'Finance' },
//       { name: 'Charlie Brown', department: 'IT' },
//       { name: 'Diana Prince', department: 'Operations' },
//       { name: 'Eve Davis', department: 'HR' },
//       { name: 'Frank Miller', department: 'Finance' },
//       { name: 'Grace Lee', department: 'IT' },
//       { name: 'Henry Wilson', department: 'Operations' },
//     ];

//     for (let i = 0; i < employeeNames.length; i++) {
//       const emp = await User.create({
//         name: employeeNames[i].name,
//         email: `employee${i + 1}@example.com`,
//         passwordHash,
//         role: 'employee',
//         companyId: i < 4 ? company1._id : company2._id,
//         department: employeeNames[i].department,
//         points: Math.floor(Math.random() * 500),
//       });
//       employees.push(emp);
//     }

//     // Create campaigns
//     console.log('[v0] Creating campaigns...');
//     const campaigns = [];

//     for (let i = 0; i < 5; i++) {
//       const campaign = await Campaign.create({
//         campaignName: `Campaign ${i + 1}`,
//         type: ['phishing', 'smishing', 'vishing'][i % 3],
//         createdBy: admin1._id,
//         companyId: company1._id,
//         description: `Test campaign ${i + 1}`,
//         status: i < 3 ? 'active' : 'completed',
//         startDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
//         targetCount: employees.slice(0, 4).length,
//         completedCount: Math.floor(Math.random() * 4),
//       });
//       campaigns.push(campaign);
//     }

//     // Create simulation results
//     console.log('[v0] Creating simulation results...');
//     for (const campaign of campaigns) {
//       for (let i = 0; i < 4; i++) {
//         await SimulationResult.create({
//           userId: employees[i]._id,
//           campaignId: campaign._id,
//           emailOpened: Math.random() > 0.3,
//           linkClicked: Math.random() > 0.5,
//           credentialsSubmitted: Math.random() > 0.7,
//           reportedPhishing: Math.random() > 0.6,
//           timestamp: new Date(),
//         });
//       }
//     }

//     // Create leaderboard
//     console.log('[v0] Creating leaderboard...');
//     let rank = 1;
//     const sortedEmployees = employees.sort((a, b) => b.points - a.points);

//     for (const emp of sortedEmployees) {
//       await Leaderboard.create({
//         userId: emp._id,
//         companyId: emp.companyId,
//         department: emp.department,
//         score: emp.points,
//         rank: rank++,
//       });
//     }

//     console.log('[v0] Database seeded successfully!');
//     console.log(`[v0] Created: ${employees.length} employees, ${campaigns.length} campaigns`);
//   } catch (error) {
//     console.error('[v0] Seed error:', error);
//     process.exit(1);
//   } finally {
//     await disconnectDB();
//   }
// };

// seedDatabase();





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

// ────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE SEED DATA FOR ATTACKAWARE 3.0
// Creates multiple companies with different subscription levels, 15 employees each,
// varied simulation data across different timelines to showcase analytics
// ────────────────────────────────────────────────────────────────────────────

const departments = ['HR', 'Finance', 'IT', 'Security', 'Operations', 'Marketing', 'Sales', 'Legal', 'Engineering', 'Support'];
const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Government', 'Energy'];
const difficultyLevels = ['easy', 'medium', 'hard', 'expert'];
const simulationTypes = ['phishing', 'smishing', 'vishing'];

// Employee names for realistic data
const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 'Olivia'];
const lastNames = ['Anderson', 'Brown', 'Clark', 'Davis', 'Evans', 'Fisher', 'Green', 'Hall', 'Jones', 'King', 'Lee', 'Miller', 'Nelson', 'Parker', 'Rodriguez'];

// Company templates with different characteristics
const companyTemplates = [
  { name: 'TechCorp', industry: 'Technology', plan: 'Enterprise Premium', riskProfile: 'low' },
  { name: 'FinanceHub', industry: 'Finance', plan: 'Enterprise Premium', riskProfile: 'medium' },
  { name: 'HealthMed', industry: 'Healthcare', plan: 'Enterprise Premium', riskProfile: 'low' },
  { name: 'RetailMax', industry: 'Retail', plan: 'Professional', riskProfile: 'high' },
  { name: 'ManufacturePro', industry: 'Manufacturing', plan: 'Professional', riskProfile: 'medium' },
  { name: 'EduSoft', industry: 'Education', plan: 'Basic', riskProfile: 'medium' },
  { name: 'GovSecure', industry: 'Government', plan: 'Enterprise Premium', riskProfile: 'very_low' },
  { name: 'EnergyFlow', industry: 'Energy', plan: 'Professional', riskProfile: 'low' },
  { name: 'StartupInc', industry: 'Technology', plan: 'Basic', riskProfile: 'high' },
  { name: 'ConsultGroup', industry: 'Finance', plan: 'Professional', riskProfile: 'medium' },
];

const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate realistic phone numbers
const generatePhoneNumber = (): string => {
  const areaCode = getRandomInt(200, 999);
  const exchange = getRandomInt(200, 999);
  const number = getRandomInt(1000, 9999);
  return `+1${areaCode}${exchange}${number}`;
};

// Generate dates in the past for historical data
const generatePastDate = (daysAgo: number): Date => {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
};

// Calculate risk score based on simulation outcomes
const calculateEmployeeRisk = (clickRate: number, compromiseRate: number, reportRate: number): {
  score: number;
  level: 'very_low' | 'low' | 'medium' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
} => {
  const riskScore = Math.min(100, Math.max(0, 
    (clickRate * 0.4) + (compromiseRate * 0.6) - (reportRate * 0.3)
  ));
  
  let level: 'very_low' | 'low' | 'medium' | 'high' | 'critical';
  if (riskScore <= 15) level = 'very_low';
  else if (riskScore <= 30) level = 'low';
  else if (riskScore <= 50) level = 'medium';
  else if (riskScore <= 75) level = 'high';
  else level = 'critical';

  const trend = getRandom(['improving', 'stable', 'declining', 'insufficient_data']);
  
  return { score: Math.round(riskScore), level, trend };
};

const seedComprehensiveData = async (): Promise<void> => {
  try {
    console.log('🚀 Starting comprehensive AttackAware 3.0 seed...');
    await connectDB();

    console.log('🧹 Clearing existing data...');
    // Delete in correct order to avoid foreign key constraints
    await SimulationResult.deleteMany({});
    await Campaign.deleteMany({});
    await Leaderboard.deleteMany({});
    await UserGame.deleteMany({});
    await UserVideo.deleteMany({});
    await UserQuiz.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});
    await MembershipPlan.deleteMany({});
    
    console.log('✅ All existing data cleared');

    const passwordHash = await bcryptjs.hash('password123', 10);

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. CREATE MEMBERSHIP PLANS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('💎 Creating membership plans...');
    
    const basicPlan = await MembershipPlan.create({
      name: 'Basic',
      price: 99,
      features: ['Basic Phishing Simulations', '5 Videos', 'Basic Analytics'],
      maxEmployees: 50,
      isActive: true,
    });

    const professionalPlan = await MembershipPlan.create({
      name: 'Professional',
      price: 299,
      features: ['All Simulation Types', '25 Videos', '10 Games', 'Advanced Analytics'],
      maxEmployees: 200,
      isActive: true,
    });

    const enterprisePlan = await MembershipPlan.create({
      name: 'Enterprise Premium',
      price: 999,
      features: ['All Campaigns', 'Unlimited Videos', 'All Games', 'Enterprise Analytics', 'Custom Reports'],
      maxEmployees: 10000,
      isActive: true,
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. CREATE SUPER ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@attackaware.com',
      passwordHash,
      role: 'super_admin',
      department: 'Management',
      points: 0,
      badge: 'System Administrator',
    });

    console.log('👑 Super Admin created');

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. CREATE COMPANIES WITH VARIED SUBSCRIPTION PLANS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('🏢 Creating companies with varied subscription levels...');
    
    const companies = [];
    const allEmployees: any[] = [];
    const allCampaigns: any[] = [];

    for (let i = 1; i <= 10; i++) {
      const template = companyTemplates[(i - 1) % companyTemplates.length];
      
      // Create company admin
      const admin = await User.create({
        name: `${template.name} Admin`,
        email: `admin${i}@company${i}.com`,
        passwordHash,
        role: 'admin',
        department: 'Security',
        points: getRandomInt(200, 800),
        badge: 'Security Champion',
      });

      // Select subscription plan
      let subscriptionPlan;
      if (template.plan === 'Basic') subscriptionPlan = basicPlan._id;
      else if (template.plan === 'Professional') subscriptionPlan = professionalPlan._id;
      else subscriptionPlan = enterprisePlan._id;

      // Create company
      const company = await Company.create({
        companyName: `${template.name} ${i}`,
        industry: template.industry,
        adminId: admin._id,
        approvalStatus: 'approved',
        subscriptionPlan,
        employeeCount: 15,
      });

      // Link admin to company
      admin.companyId = company._id;
      await admin.save();

      companies.push({ 
        company, 
        admin, 
        template,
        plan: template.plan 
      });

      console.log(`🏢 Created ${company.companyName} (${template.plan})`);

      // ═════════════════════════════════════════════════════════════════════════
      // 4. CREATE 15 EMPLOYEES PER COMPANY
      // ═════════════════════════════════════════════════════════════════════════
      const companyEmployees = [];
      
      for (let j = 1; j <= 15; j++) {
        const firstName = getRandom(firstNames);
        const lastName = getRandom(lastNames);
        
        const employee = await User.create({
          name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${j}@company${i}.com`,
          passwordHash,
          role: 'employee',
          companyId: company._id,
          department: getRandom(departments),
          phoneNumber: generatePhoneNumber(),
          points: getRandomInt(0, 1000),
          badge: getRandom(['Rookie', 'Security Learner', 'Security Aware', 'Security Expert', 'Security Champion']),
          trainingProgress: getRandomInt(0, 100),
          // Will calculate risk after creating simulation data
          riskScore: 0,
          riskLevel: 'low',
          riskTrend: 'insufficient_data',
        });

        companyEmployees.push(employee);
        allEmployees.push(employee);
      }

      // ═════════════════════════════════════════════════════════════════════════
      // 5. CREATE CAMPAIGNS WITH VARIED TIMELINES
      // ═════════════════════════════════════════════════════════════════════════
      const campaignCount = template.plan === 'Basic' ? 2 : template.plan === 'Professional' ? 4 : 6;
      
      for (let k = 1; k <= campaignCount; k++) {
        const daysAgo = getRandomInt(1, 180); // Campaigns from 1 to 180 days ago
        const startDate = generatePastDate(daysAgo);
        const endDate = new Date(startDate.getTime() + getRandomInt(1, 30) * 24 * 60 * 60 * 1000);
        
        const campaign = await Campaign.create({
          campaignName: `${template.name} Security Test ${k}`,
          type: getRandom(simulationTypes),
          difficulty: getRandom(difficultyLevels),
          createdBy: admin._id,
          companyId: company._id,
          description: `${getRandom(['Phishing', 'Social Engineering', 'Credential Theft'])} awareness campaign`,
          status: daysAgo > 7 ? 'completed' : getRandom(['active', 'completed']),
          startDate,
          endDate: daysAgo > 7 ? endDate : undefined,
          targetEmployees: companyEmployees.map(e => ({ _id: e._id, phone: e.phoneNumber })),
          targetCount: 15,
          completedCount: 15,
        });

        allCampaigns.push({ campaign, employees: companyEmployees, company });

        // ═══════════════════════════════════════════════════════════════════════
        // 6. CREATE SIMULATION RESULTS WITH REALISTIC TIMELINES
        // ═══════════════════════════════════════════════════════════════════════
        for (const emp of companyEmployees) {
          const simulationDate = new Date(startDate.getTime() + getRandomInt(0, 5) * 24 * 60 * 60 * 1000);
          
          // Risk profile influences simulation outcomes
          let clickChance = 0.3; // 30% base click rate
          let compromiseChance = 0.15; // 15% base compromise rate
          let reportChance = 0.4; // 40% base report rate

          // Adjust based on company risk profile
          if (template.riskProfile === 'very_low') {
            clickChance = 0.1; compromiseChance = 0.05; reportChance = 0.8;
          } else if (template.riskProfile === 'low') {
            clickChance = 0.2; compromiseChance = 0.08; reportChance = 0.6;
          } else if (template.riskProfile === 'high') {
            clickChance = 0.5; compromiseChance = 0.25; reportChance = 0.2;
          }

          // Determine simulation outcomes
          const emailOpened = campaign.type === 'phishing' ? Math.random() > 0.2 : false;
          const smsDelivered = campaign.type === 'smishing' ? Math.random() > 0.1 : false;
          const callAnswered = campaign.type === 'vishing' ? Math.random() > 0.3 : false;
          
          const linkClicked = emailOpened && Math.random() < clickChance;
          const smsLinkClicked = smsDelivered && Math.random() < clickChance;
          const voiceEngaged = callAnswered && Math.random() < clickChance;
          
          const credentialsSubmitted = (linkClicked || smsLinkClicked) && Math.random() < compromiseChance;
          const reportedPhishing = !credentialsSubmitted && Math.random() < reportChance;
          const voiceReported = callAnswered && !voiceEngaged && Math.random() < reportChance;
          
          // Create realistic timestamps
          let reportedAt = null;
          if (reportedPhishing || voiceReported) {
            const reportDelay = getRandomInt(300, 10800) * 1000; // 5 min to 3 hours
            reportedAt = new Date(simulationDate.getTime() + reportDelay);
          }

          await SimulationResult.create({
            userId: emp._id,
            campaignId: campaign._id,
            simulationType: campaign.type,
            
            // Email/Phishing fields
            emailOpened,
            linkClicked,
            
            // SMS/Smishing fields
            smsSent: campaign.type === 'smishing',
            smsSentAt: campaign.type === 'smishing' ? simulationDate : null,
            smsDelivered,
            smsLinkClicked,
            phoneNumber: campaign.type === 'smishing' ? emp.phoneNumber : null,
            
            // Voice/Vishing fields
            callInitiated: campaign.type === 'vishing',
            callInitiatedAt: campaign.type === 'vishing' ? simulationDate : null,
            callAnswered,
            voiceEngaged,
            voiceReported,
            
            // Common fields
            credentialsSubmitted,
            reportedPhishing,
            reportedAt,
            createdAt: simulationDate,
            timestamp: simulationDate,
          });
        }
      }

      // ═════════════════════════════════════════════════════════════════════════
      // 7. CREATE TRAINING DATA (PREMIUM FEATURES)
      // ═════════════════════════════════════════════════════════════════════════
      if (template.plan !== 'Basic') {
        for (const emp of companyEmployees) {
          // Video progress
          const videoCount = template.plan === 'Enterprise Premium' ? getRandomInt(5, 15) : getRandomInt(2, 8);
          for (let v = 0; v < videoCount; v++) {
            await UserVideo.create({
              userId: emp._id,
              videoId: new mongoose.Types.ObjectId(),
              status: 'Completed',
              watchedAt: generatePastDate(getRandomInt(1, 90)),
              companyId: company._id,
            });
          }

          // Quiz attempts
          const quizCount = template.plan === 'Enterprise Premium' ? getRandomInt(8, 20) : getRandomInt(3, 12);
          for (let q = 0; q < quizCount; q++) {
            await UserQuiz.create({
              userId: emp._id,
              quizId: new mongoose.Types.ObjectId(),
              score: getRandomInt(6, 10),
              totalQuestions: 10,
              completedAt: generatePastDate(getRandomInt(1, 60)),
              companyId: company._id,
            });
          }

          // Game sessions
          if (template.plan === 'Professional' || template.plan === 'Enterprise Premium') {
            const gameCount = getRandomInt(3, 10);
            for (let g = 0; g < gameCount; g++) {
              await UserGame.create({
                userId: emp._id,
                gameId: new mongoose.Types.ObjectId(),
                score: getRandomInt(500, 2000),
                playedAt: generatePastDate(getRandomInt(1, 45)),
                companyId: company._id,
              });
            }
          }
        }
      }

      // ═════════════════════════════════════════════════════════════════════════
      // 8. UPDATE RISK SCORES FOR ALL EMPLOYEES (simplified for speed)
      // ═════════════════════════════════════════════════════════════════════════
      for (const emp of companyEmployees) {
        const riskData = calculateEmployeeRisk(
          getRandomInt(10, 60), // click rate
          getRandomInt(5, 25),  // compromise rate  
          getRandomInt(20, 80)  // report rate
        );
        
        await User.findByIdAndUpdate(emp._id, {
          riskScore: riskData.score,
          riskLevel: riskData.level,
          riskTrend: riskData.trend,
          riskCalculatedAt: new Date(),
        });
      }

      // ═════════════════════════════════════════════════════════════════════════
      // 9. CREATE LEADERBOARD
      // ═════════════════════════════════════════════════════════════════════════
      const sortedEmployees = [...companyEmployees].sort((a, b) => b.points - a.points);
      let rank = 1;
      
      for (const emp of sortedEmployees) {
        await Leaderboard.create({
          userId: emp._id,
          companyId: company._id,
          department: emp.department,
          score: emp.points,
          rank: rank++,
        });
      }
    }

    console.log('✅ COMPREHENSIVE SEED COMPLETE!');
    console.log('═══════════════════════════════════════════════');
    console.log(`🏢 Companies Created: ${companies.length}`);
    console.log(`👥 Total Employees: ${allEmployees.length} (15 per company)`);
    console.log(`📢 Total Campaigns: ${allCampaigns.length}`);
    console.log(`📊 Simulation Results: ${allEmployees.length * (allCampaigns.length / companies.length)} per company`);
    console.log('═══════════════════════════════════════════════');
    console.log('💡 LOGIN CREDENTIALS:');
    console.log('   Super Admin: admin@attackaware.com / password123');
    console.log('   Company Admins: admin1@company1.com to admin10@company10.com / password123');
    console.log('   Employees: [firstname].[lastname][1-15]@company[1-10].com / password123');
    console.log('═══════════════════════════════════════════════');
    console.log('🎯 FEATURE ACCESS:');
    console.log('   - Companies 1,4,7,10 (TechCorp, RetailMax, etc.): Premium Features');
    console.log('   - Companies 2,5,8 (FinanceHub, ManufacturePro, etc.): Professional Features'); 
    console.log('   - Companies 3,6,9 (HealthMed, EduSoft, etc.): Basic Features');
    console.log('═══════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Comprehensive Seed Error:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

seedComprehensiveData();