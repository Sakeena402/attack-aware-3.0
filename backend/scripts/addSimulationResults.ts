import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Campaign } from '../src/models/Campaign.js';
import SimulationResult from '../src/models/SimulationResult.js';
import { recalculateUserRisk } from '../src/services/analyticsService.js';

dotenv.config();

// ────────────────────────────────────────────────────────────────────────────
// ADD REALISTIC SIMULATION RESULTS TO EXISTING CAMPAIGNS
// یہ script آپ کی موجودہ campaigns میں realistic simulation results add کرے گا
// ────────────────────────────────────────────────────────────────────────────

// مختلف user behavior patterns
const userBehaviorProfiles = {
  security_aware: {
    name: 'Security Aware User',
    clickChance: 0.1,        // 10% click کرنے کا chance
    compromiseChance: 0.02,  // 2% compromise ہونے کا chance
    reportChance: 0.85,      // 85% report کرنے کا chance
    description: 'بہت security conscious user'
  },
  average_user: {
    name: 'Average User', 
    clickChance: 0.3,        // 30% click
    compromiseChance: 0.12,  // 12% compromise
    reportChance: 0.45,      // 45% report
    description: 'عام user جو کبھی کبھی suspicious links پر click کر دیتا ہے'
  },
  risk_prone: {
    name: 'High Risk User',
    clickChance: 0.65,       // 65% click
    compromiseChance: 0.35,  // 35% compromise
    reportChance: 0.15,      // 15% report
    description: 'زیادہ خطرناک user جو اکثر phishing میں پھنس جاتا ہے'
  },
  cautious_clicker: {
    name: 'Cautious But Clickable',
    clickChance: 0.4,        // 40% click
    compromiseChance: 0.08,  // 8% compromise (clicks but rarely submits data)
    reportChance: 0.6,       // 60% report
    description: 'click تو کرتا ہے لیکن data submit نہیں کرتا'
  }
};

// Random behavior profile assign کرنے کا function
const getRandomBehaviorProfile = () => {
  const profiles = Object.values(userBehaviorProfiles);
  return profiles[Math.floor(Math.random() * profiles.length)];
};

// Response time categories (کتنی جلدی report کیا)
const getResponseTime = (isReported: boolean): { bucket: string; delay: number } => {
  if (!isReported) return { bucket: 'none', delay: 0 };
  
  const rand = Math.random();
  if (rand < 0.2) {
    // Excellent - 5 minutes سے کم
    return { bucket: 'excellent', delay: Math.random() * 300000 }; // 0-5 min
  } else if (rand < 0.4) {
    // Good - 5-30 minutes
    return { bucket: 'good', delay: 300000 + Math.random() * 1500000 }; // 5-30 min
  } else if (rand < 0.7) {
    // Average - 30 minutes سے 3 hours
    return { bucket: 'average', delay: 1800000 + Math.random() * 9000000 }; // 30min-3h
  } else {
    // Poor - 3 hours سے زیادہ
    return { bucket: 'poor', delay: 10800000 + Math.random() * 43200000 }; // 3-15 hours
  }
};

// Realistic phone number generator
const generatePhoneNumber = (): string => {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `+92${areaCode}${exchange}${number}`;
};

// Past date generator for historical campaigns
const generateCampaignDate = (daysAgo: number): Date => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - daysAgo);
  
  // Add some random hours/minutes to make it more realistic
  baseDate.setHours(
    Math.floor(Math.random() * 24), 
    Math.floor(Math.random() * 60), 
    Math.floor(Math.random() * 60)
  );
  
  return baseDate;
};

const addRealisticSimulationResults = async (): Promise<void> => {
  try {
    console.log('🚀 Starting simulation results generation...');
    await connectDB();

    // پہلے existing campaigns اور users لے آتے ہیں
    const campaigns = await Campaign.find({});
    const allUsers = await User.find({ role: 'employee' });
    const allCompanies = await Company.find({});

    console.log(`📊 Found ${campaigns.length} campaigns and ${allUsers.length} employees`);

    if (campaigns.length === 0 || allUsers.length === 0) {
      console.log('❌ No campaigns or employees found. Please run seedData first.');
      return;
    }

    // پہلے existing simulation results clear کر دیتے ہیں
    console.log('🧹 Clearing existing simulation results...');
    await SimulationResult.deleteMany({});

    let totalSimulationsCreated = 0;

    // ہر campaign کے لیے simulation results بناتے ہیں
    for (const campaign of campaigns) {
      console.log(`📢 Processing campaign: ${campaign.campaignName}`);
      
      // اس company کے employees لے آتے ہیں
      const companyEmployees = allUsers.filter(
        user => user.companyId && user.companyId.toString() === campaign.companyId.toString()
      );

      // Company name کے لیے
      const company = allCompanies.find(c => c._id.toString() === campaign.companyId.toString());
      const companyName = company ? company.companyName : 'Unknown Company';

      if (companyEmployees.length === 0) {
        console.log(`⚠️  No employees found for company ${companyName}`);
        continue;
      }

      // Campaign کا date decide کرتے ہیں (1-90 days ago)
      const daysAgo = Math.floor(Math.random() * 90) + 1;
      const campaignStartDate = generateCampaignDate(daysAgo);
      
      // Campaign update کرتے ہیں with realistic dates
      await Campaign.findByIdAndUpdate(campaign._id, {
        startDate: campaignStartDate,
        status: daysAgo > 7 ? 'completed' : (Math.random() > 0.5 ? 'active' : 'completed'),
        targetCount: companyEmployees.length,
        completedCount: companyEmployees.length,
      });

      // ہر employee کے لیے simulation result بناتے ہیں
      for (const employee of companyEmployees) {
        // Employee کو random behavior profile assign کرتے ہیں
        const behaviorProfile = getRandomBehaviorProfile();
        
        // Simulation کا exact time (campaign start سے کچھ hours/days بعد)
        const simulationDate = new Date(campaignStartDate);
        simulationDate.setHours(simulationDate.getHours() + Math.floor(Math.random() * 120)); // 0-5 days later

        // User behavior simulate کرتے ہیں
        let emailOpened = false;
        let smsDelivered = false;
        let callAnswered = false;
        let linkClicked = false;
        let smsLinkClicked = false;
        let voiceEngaged = false;
        let credentialsSubmitted = false;
        let reportedPhishing = false;
        let voiceReported = false;

        // Campaign type کے according initial actions
        if (campaign.type === 'phishing') {
          emailOpened = Math.random() > 0.15; // 85% emails open ہوتے ہیں
          if (emailOpened) {
            linkClicked = Math.random() < behaviorProfile.clickChance;
            if (linkClicked) {
              credentialsSubmitted = Math.random() < behaviorProfile.compromiseChance;
            }
            // Report کرنے کا chance (اگر compromise نہیں ہوا)
            if (!credentialsSubmitted) {
              reportedPhishing = Math.random() < behaviorProfile.reportChance;
            }
          }
        } 
        else if (campaign.type === 'smishing') {
          smsDelivered = Math.random() > 0.05; // 95% SMS deliver ہوتے ہیں
          if (smsDelivered) {
            smsLinkClicked = Math.random() < behaviorProfile.clickChance;
            if (smsLinkClicked) {
              credentialsSubmitted = Math.random() < behaviorProfile.compromiseChance;
            }
            // Report کرنے کا chance
            if (!credentialsSubmitted) {
              reportedPhishing = Math.random() < behaviorProfile.reportChance;
            }
          }
        }
        else if (campaign.type === 'vishing') {
          callAnswered = Math.random() > 0.4; // 60% calls answer ہوتے ہیں
          if (callAnswered) {
            voiceEngaged = Math.random() < behaviorProfile.clickChance; // voice engagement
            // Voice calls میں credentials directly submit نہیں ہوتے
            // Report کرنے کا chance
            voiceReported = Math.random() < behaviorProfile.reportChance;
          }
        }

        // Response time calculate کرتے ہیں
        const isReported = reportedPhishing || voiceReported;
        const responseTime = getResponseTime(isReported);
        let reportedAt = null;
        
        if (isReported) {
          reportedAt = new Date(simulationDate.getTime() + responseTime.delay);
        }

        // Phone number assign کرتے ہیں اگر نہیں ہے
        if (!employee.phoneNumber) {
          await User.findByIdAndUpdate(employee._id, {
            phoneNumber: generatePhoneNumber()
          });
        }

        // Simulation result create کرتے ہیں
        await SimulationResult.create({
          userId: employee._id,
          campaignId: campaign._id,
          simulationType: campaign.type,
          trackingToken: `sim_${campaign._id}_${employee._id}_${Date.now()}`,
          
          // Email/Phishing fields
          emailOpened,
          emailOpenedAt: emailOpened ? simulationDate : null,
          linkClicked,
          clickedAt: linkClicked ? new Date(simulationDate.getTime() + Math.random() * 3600000) : null,
          
          // SMS/Smishing fields
          smsSent: campaign.type === 'smishing',
          smsSentAt: campaign.type === 'smishing' ? simulationDate : null,
          smsDelivered,
          smsDeliveredAt: smsDelivered ? simulationDate : null,
          smsLinkClicked,
          smsClickedAt: smsLinkClicked ? new Date(simulationDate.getTime() + Math.random() * 3600000) : null,
          phoneNumber: employee.phoneNumber,
          
          // Voice/Vishing fields
          callInitiated: campaign.type === 'vishing',
          callInitiatedAt: campaign.type === 'vishing' ? simulationDate : null,
          callAnswered,
          callAnsweredAt: callAnswered ? simulationDate : null,
          voiceEngaged,
          voiceReported,
          
          // Common outcome fields
          credentialsSubmitted,
          credentialsSubmittedAt: credentialsSubmitted ? new Date(simulationDate.getTime() + Math.random() * 1800000) : null,
          reportedPhishing,
          reportedAt,
          
          // Metadata
          clickIpAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          clickUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          
          createdAt: simulationDate,
          timestamp: simulationDate,
        });

        totalSimulationsCreated++;
      }

      console.log(`✅ Created ${companyEmployees.length} simulation results for ${campaign.campaignName}`);
    }

    // اب سبھی employees کا risk score calculate کرتے ہیں
    console.log('🎯 Calculating risk scores for all employees...');
    const employees = await User.find({ role: 'employee' });
    
    for (const employee of employees) {
      try {
        await recalculateUserRisk(employee._id.toString());
      } catch (error) {
        console.log(`⚠️ Could not calculate risk for ${employee.name}: ${error.message}`);
        // Fallback: manual risk assignment
        const randomRisk = Math.random();
        let riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'critical';
        let riskScore: number;
        
        if (randomRisk < 0.2) {
          riskLevel = 'very_low';
          riskScore = Math.floor(Math.random() * 15);
        } else if (randomRisk < 0.4) {
          riskLevel = 'low';
          riskScore = 15 + Math.floor(Math.random() * 15);
        } else if (randomRisk < 0.6) {
          riskLevel = 'medium';
          riskScore = 30 + Math.floor(Math.random() * 20);
        } else if (randomRisk < 0.8) {
          riskLevel = 'high';
          riskScore = 50 + Math.floor(Math.random() * 25);
        } else {
          riskLevel = 'critical';
          riskScore = 75 + Math.floor(Math.random() * 25);
        }
        
        await User.findByIdAndUpdate(employee._id, {
          riskScore,
          riskLevel,
          riskTrend: Math.random() > 0.5 ? 'improving' : Math.random() > 0.5 ? 'stable' : 'declining',
          riskCalculatedAt: new Date(),
        });
      }
    }

    console.log('✅ SIMULATION RESULTS GENERATION COMPLETE!');
    console.log('═══════════════════════════════════════════════');
    console.log(`📊 Total Simulation Results Created: ${totalSimulationsCreated}`);
    console.log(`📢 Campaigns Processed: ${campaigns.length}`);
    console.log(`👥 Employees Processed: ${allUsers.length}`);
    console.log('═══════════════════════════════════════════════');
    console.log('🎯 NOW YOU CAN VIEW:');
    console.log('   ✓ Realistic user behaviors in analytics');
    console.log('   ✓ Click/Report/Compromise rates');
    console.log('   ✓ Response time analysis');
    console.log('   ✓ Risk level distributions');
    console.log('   ✓ Department-wise breakdowns');
    console.log('   ✓ Timeline-based trends');
    console.log('═══════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error generating simulation results:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

addRealisticSimulationResults();