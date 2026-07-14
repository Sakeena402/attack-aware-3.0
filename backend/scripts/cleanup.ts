import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Company } from '../src/models/Company.js';
import { Campaign } from '../src/models/Campaign.js';
import SimulationResult from '../src/models/SimulationResult.js';

dotenv.config();

async function run() {
  await connectDB();
  
  // Delete all users except auradev@company.com
  const userDelete = await User.deleteMany({ email: { $ne: 'auradev@company.com' } });
  console.log(`Deleted users count: ${userDelete.deletedCount}`);

  const compDelete = await Company.deleteMany({});
  console.log(`Deleted companies count: ${compDelete.deletedCount}`);

  const campDelete = await Campaign.deleteMany({});
  console.log(`Deleted campaigns count: ${campDelete.deletedCount}`);

  const simDelete = await SimulationResult.deleteMany({});
  console.log(`Deleted simulation results count: ${simDelete.deletedCount}`);

  await disconnectDB();
  console.log('Database cleaned successfully.');
}

run().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
