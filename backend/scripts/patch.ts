import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  const db = mongoose.connection.db;
  if (db) {
    await db.collection('simulationresults').updateMany({ simulationType: 'smishing' }, { $set: { smsSent: true, smsDelivered: true, smsSentAt: new Date() } });
    await db.collection('simulationresults').updateMany({ simulationType: 'vishing' }, { $set: { callInitiated: true, callAnswered: true, callInitiatedAt: new Date() } });
  }
  console.log('Done');
  process.exit(0);
});
