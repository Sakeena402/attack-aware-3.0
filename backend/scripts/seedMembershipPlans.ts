/// <reference types="node" />
import 'dotenv/config';
import mongoose from 'mongoose';
import { MembershipPlan } from '../src/models/MembershipPlan.js';

const plans = [
  { planId: 'ind-basic', category: 'individual', name: 'Basic', seats: 1, priceUSD: 0, priceRs: 0, billing: 'free',
    description: 'Perfect for individuals getting started',
    features: ['EN/UR training videos', 'Games & quizzes', '1 user'], highlight: false },

  { planId: 'ind-premium', category: 'individual', name: 'Premium', seats: 1, priceUSD: 13, priceRs: 3614, billing: 'monthly',
    description: 'For individuals who want the full toolkit',
    features: ['AI-generated quizzes', 'Full bilingual (EN/UR) content library', 'Priority support'], highlight: true },

  { planId: 'ent-demo', category: 'enterprise', name: 'Demo Trial', seats: 1, priceUSD: 15, priceRs: 4170, billing: 'trial', trialDays: 15,
    description: '15-day full-feature trial for your org',
    features: ['Vishing & smishing templates', 'AI generation'], highlight: false },

  { planId: 'ent-basic', category: 'enterprise', name: 'Basic', seats: 10, priceUSD: 20, priceUSDPerUser: 2, priceRs: 5560, billing: 'monthly',
    description: 'Starting price for small teams (10 seats)',
    features: ['Templated phishing simulations', 'EN/UR videos, games & quizzes'], highlight: false },

  { planId: 'ent-advanced', category: 'enterprise', name: 'Advanced', seats: 25, priceUSD: 75, priceUSDPerUser: 3, priceRs: 20850, billing: 'monthly',
    description: 'For growing teams that need more coverage',
    features: ['AI-generated phishing & vishing', 'Twilio integration'], highlight: true },

  { planId: 'ent-premium', category: 'enterprise', name: 'Premium', seats: 50, priceUSD: 165, priceUSDPerUser: 3.3, priceRs: 45870, billing: 'monthly',
    description: 'Full AI-enhanced suite for larger orgs',
    features: ['Phishing, vishing & smishing', 'AI generation + Twilio', '50 seats'], highlight: false },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  // 🔑 must match connectDB() in src/config/database.ts exactly, or this
  // seeds a different database than the one the running server reads from.
  await mongoose.connect(uri, { dbName: 'attackaware3' });
  console.log('Connected to MongoDB (attackaware3)');

  for (const plan of plans) {
    await MembershipPlan.findOneAndUpdate(
      { planId: plan.planId },
      { ...plan, maxEmployees: plan.seats },
      { upsert: true, new: true }
    );
    console.log(`Upserted plan: ${plan.planId}`);
  }

  console.log('Seed complete');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});