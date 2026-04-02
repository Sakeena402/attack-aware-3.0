import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Campaign } from '../src/models/Campaign.js';
import  SimulationResult  from '../src/models/SimulationResult.js';
import { Leaderboard } from '../src/models/Leaderboard.js';

dotenv.config();

const seedDatabase = async (): Promise<void> => {
  try {
    console.log('[v0] Connecting to database...');
    await connectDB();

    // Create users
    console.log('[v0] Creating users...');
    const passwordHash = await bcryptjs.hash('password123', 10);

    // Clear existing data
    console.log('[v0] Clearing existing data...');
    await User.deleteMany({});
    await Company.deleteMany({});
    await Campaign.deleteMany({});
    await SimulationResult.deleteMany({});
    await Leaderboard.deleteMany({});

    const admin1 = await User.create({
      name: 'John Admin',
      email: 'admin1@techcorp.com',
      passwordHash,
      role: 'admin',
      department: 'Security',
    });

    const admin2 = await User.create({
      name: 'Jane Admin',
      email: 'admin2@finance.com',
      passwordHash,
      role: 'admin',
     
      department: 'Security',
    });

    // Create companies
    console.log('[v0] Creating companies...');
    const company1 = await Company.create({
      companyName: 'TechCorp Inc',
      industry: 'Technology',
      adminId: admin1._id,
    });

    const company2 = await Company.create({
      companyName: 'Finance Solutions Ltd',
      industry: 'Finance',
      adminId: admin2._id,
    });

    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@cyberaware.com',
      passwordHash,
      role: 'super_admin',
      department: 'Management',
    });

    
    // Update company admin references
    company1.adminId = admin1._id;
    await company1.save();

    company2.adminId = admin2._id;
    await company2.save();

    // Create employees
    const employees = [];
    const employeeNames = [
      { name: 'Alice Johnson', department: 'HR' },
      { name: 'Bob Smith', department: 'Finance' },
      { name: 'Charlie Brown', department: 'IT' },
      { name: 'Diana Prince', department: 'Operations' },
      { name: 'Eve Davis', department: 'HR' },
      { name: 'Frank Miller', department: 'Finance' },
      { name: 'Grace Lee', department: 'IT' },
      { name: 'Henry Wilson', department: 'Operations' },
    ];

    for (let i = 0; i < employeeNames.length; i++) {
      const emp = await User.create({
        name: employeeNames[i].name,
        email: `employee${i + 1}@example.com`,
        passwordHash,
        role: 'employee',
        companyId: i < 4 ? company1._id : company2._id,
        department: employeeNames[i].department,
        points: Math.floor(Math.random() * 500),
      });
      employees.push(emp);
    }

    // Create campaigns
    console.log('[v0] Creating campaigns...');
    const campaigns = [];

    for (let i = 0; i < 5; i++) {
      const campaign = await Campaign.create({
        campaignName: `Campaign ${i + 1}`,
        type: ['phishing', 'smishing', 'vishing'][i % 3],
        createdBy: admin1._id,
        companyId: company1._id,
        description: `Test campaign ${i + 1}`,
        status: i < 3 ? 'active' : 'completed',
        startDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        targetCount: employees.slice(0, 4).length,
        completedCount: Math.floor(Math.random() * 4),
      });
      campaigns.push(campaign);
    }

    // Create simulation results
    console.log('[v0] Creating simulation results...');
    for (const campaign of campaigns) {
      for (let i = 0; i < 4; i++) {
        await SimulationResult.create({
          userId: employees[i]._id,
          campaignId: campaign._id,
          emailOpened: Math.random() > 0.3,
          linkClicked: Math.random() > 0.5,
          credentialsSubmitted: Math.random() > 0.7,
          reportedPhishing: Math.random() > 0.6,
          timestamp: new Date(),
        });
      }
    }

    // Create leaderboard
    console.log('[v0] Creating leaderboard...');
    let rank = 1;
    const sortedEmployees = employees.sort((a, b) => b.points - a.points);

    for (const emp of sortedEmployees) {
      await Leaderboard.create({
        userId: emp._id,
        companyId: emp.companyId,
        department: emp.department,
        score: emp.points,
        rank: rank++,
      });
    }

    console.log('[v0] Database seeded successfully!');
    console.log(`[v0] Created: ${employees.length} employees, ${campaigns.length} campaigns`);
  } catch (error) {
    console.error('[v0] Seed error:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

seedDatabase();
