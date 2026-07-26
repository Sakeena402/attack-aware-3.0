import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Campaign } from '../src/models/Campaign.js';
import SimulationResult from '../src/models/SimulationResult.js';

dotenv.config();

const verifyAnalytics = async () => {
  try {
    console.log('📊 Verifying Analytics Data...');
    await connectDB();

    // Overall stats
    const totalSimulations = await SimulationResult.countDocuments({});
    
    // Behavior stats
    const [
      totalClicks,
      totalCompromised,
      totalReported,
      phishingResults,
      smishingResults,
      vishingResults
    ] = await Promise.all([
      SimulationResult.countDocuments({
        $or: [{ linkClicked: true }, { smsLinkClicked: true }, { voiceEngaged: true }]
      }),
      SimulationResult.countDocuments({ credentialsSubmitted: true }),
      SimulationResult.countDocuments({
        $or: [{ reportedPhishing: true }, { voiceReported: true }]
      }),
      SimulationResult.countDocuments({ simulationType: 'phishing' }),
      SimulationResult.countDocuments({ simulationType: 'smishing' }),
      SimulationResult.countDocuments({ simulationType: 'vishing' })
    ]);

    console.log('\n📈 OVERALL SIMULATION ANALYTICS:');
    console.log('═══════════════════════════════════════════════');
    console.log(`📊 Total Simulations: ${totalSimulations}`);
    console.log(`🔗 Total Clicks/Engagements: ${totalClicks} (${(totalClicks/totalSimulations*100).toFixed(1)}%)`);
    console.log(`⚠️  Total Compromised: ${totalCompromised} (${(totalCompromised/totalSimulations*100).toFixed(1)}%)`);
    console.log(`🛡️  Total Reported: ${totalReported} (${(totalReported/totalSimulations*100).toFixed(1)}%)`);
    console.log(`📧 Phishing: ${phishingResults}`);
    console.log(`📱 Smishing: ${smishingResults}`);
    console.log(`📞 Vishing: ${vishingResults}`);

    // Response time analysis
    const responseTimeResults = await SimulationResult.aggregate([
      {
        $match: {
          $or: [{ reportedPhishing: true }, { voiceReported: true }],
          reportedAt: { $ne: null }
        }
      },
      {
        $addFields: {
          responseTimeMs: {
            $subtract: [
              '$reportedAt',
              { $ifNull: ['$smsSentAt', { $ifNull: ['$callInitiatedAt', '$createdAt'] }] }
            ]
          }
        }
      },
      {
        $addFields: {
          responseCategory: {
            $switch: {
              branches: [
                { case: { $lt: ['$responseTimeMs', 300000] }, then: 'excellent' },
                { case: { $lt: ['$responseTimeMs', 1800000] }, then: 'good' },
                { case: { $lt: ['$responseTimeMs', 10800000] }, then: 'average' }
              ],
              default: 'poor'
            }
          }
        }
      },
      {
        $group: {
          _id: '$responseCategory',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n⏱️  RESPONSE TIME ANALYSIS:');
    console.log('═══════════════════════════════════════════════');
    responseTimeResults.forEach(result => {
      console.log(`${result._id}: ${result.count} reports`);
    });

    // Risk level distribution
    const riskDistribution = await User.aggregate([
      { $match: { role: 'employee' } },
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 },
          avgPoints: { $avg: '$points' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n🎯 RISK LEVEL DISTRIBUTION:');
    console.log('═══════════════════════════════════════════════');
    riskDistribution.forEach(risk => {
      console.log(`${risk._id || 'undefined'}: ${risk.count} employees (Avg Points: ${risk.avgPoints?.toFixed(0) || 0})`);
    });

    // Company-wise analytics
    const companies = await Company.find({}).select('companyName');
    
    console.log('\n🏢 COMPANY-WISE ANALYTICS:');
    console.log('═══════════════════════════════════════════════');
    
    for (const company of companies) {
      const companyEmployees = await User.find({ 
        companyId: company._id, 
        role: 'employee' 
      }).select('riskLevel riskScore');
      
      const companyCampaigns = await Campaign.countDocuments({ 
        companyId: company._id 
      });
      
      const companySimulations = await SimulationResult.countDocuments({
        campaignId: { 
          $in: await Campaign.find({ companyId: company._id }).distinct('_id') 
        }
      });

      const companyClicks = await SimulationResult.countDocuments({
        campaignId: { 
          $in: await Campaign.find({ companyId: company._id }).distinct('_id') 
        },
        $or: [{ linkClicked: true }, { smsLinkClicked: true }, { voiceEngaged: true }]
      });

      const companyReports = await SimulationResult.countDocuments({
        campaignId: { 
          $in: await Campaign.find({ companyId: company._id }).distinct('_id') 
        },
        $or: [{ reportedPhishing: true }, { voiceReported: true }]
      });

      const avgRisk = companyEmployees.length > 0 
        ? companyEmployees.reduce((sum, emp) => sum + (emp.riskScore || 0), 0) / companyEmployees.length
        : 0;

      console.log(`\n🏢 ${company.companyName}:`);
      console.log(`   Employees: ${companyEmployees.length}`);
      console.log(`   Campaigns: ${companyCampaigns}`);
      console.log(`   Simulations: ${companySimulations}`);
      console.log(`   Click Rate: ${companySimulations > 0 ? (companyClicks/companySimulations*100).toFixed(1) : 0}%`);
      console.log(`   Report Rate: ${companySimulations > 0 ? (companyReports/companySimulations*100).toFixed(1) : 0}%`);
      console.log(`   Avg Risk Score: ${avgRisk.toFixed(1)}`);
    }

    // Department analysis
    const departmentStats = await User.aggregate([
      { $match: { role: 'employee' } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          avgRisk: { $avg: '$riskScore' },
          avgPoints: { $avg: '$points' }
        }
      },
      { $sort: { avgRisk: -1 } }
    ]);

    console.log('\n🏢 DEPARTMENT RISK ANALYSIS:');
    console.log('═══════════════════════════════════════════════');
    departmentStats.forEach(dept => {
      console.log(`${dept._id}: ${dept.count} employees, Risk: ${dept.avgRisk?.toFixed(1) || 0}, Points: ${dept.avgPoints?.toFixed(0) || 0}`);
    });

    // Sample detailed results
    const sampleResults = await SimulationResult.find({})
      .populate('userId', 'name email department')
      .populate('campaignId', 'campaignName type')
      .limit(5)
      .sort({ createdAt: -1 });

    console.log('\n📋 SAMPLE SIMULATION RESULTS:');
    console.log('═══════════════════════════════════════════════');
    sampleResults.forEach((result, index) => {
      const user = result.userId as any;
      const campaign = result.campaignId as any;
      
      console.log(`${index + 1}. ${user?.name} (${user?.department})`);
      console.log(`   Campaign: ${campaign?.campaignName} (${campaign?.type})`);
      console.log(`   Clicked: ${result.linkClicked || result.smsLinkClicked || result.voiceEngaged || false}`);
      console.log(`   Compromised: ${result.credentialsSubmitted || false}`);
      console.log(`   Reported: ${result.reportedPhishing || result.voiceReported || false}`);
      console.log(`   Date: ${result.createdAt.toLocaleDateString()}`);
      console.log('');
    });

    console.log('✅ Analytics verification complete!');

  } catch (error) {
    console.error('❌ Analytics verification error:', error);
  } finally {
    await disconnectDB();
  }
};

verifyAnalytics();