import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MembershipPlan } from '../src/models/MembershipPlan.js';
import { Video } from '../src/models/Video.js';
import { Quiz } from '../src/models/Quiz.js';
import { Game } from '../src/models/Game.js';
import { Attack } from '../src/models/Attack.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cyberaware';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clean existing dummy data for these collections to avoid duplicates on multiple runs
    await MembershipPlan.deleteMany({});
    await Video.deleteMany({});
    await Quiz.deleteMany({});
    await Game.deleteMany({});
    await Attack.deleteMany({});

    const plans = await MembershipPlan.insertMany([
      { name: 'Basic', price: 0, features: ['1 Video', '1 Quiz'], maxEmployees: 10, isActive: true },
      { name: 'Pro', price: 99, features: ['All Videos', 'All Quizzes', 'Games'], maxEmployees: 100, isActive: true },
    ]);
    console.log(`Seeded ${plans.length} plans`);

    const videos = await Video.insertMany([
      { title: 'Phishing 101', filePath: '/videos/phishing101.mp4', category: 'Phishing', language: 'en' },
      { title: 'Password Security', filePath: '/videos/passwords.mp4', category: 'Passwords', language: 'en' },
      { title: 'Safe Browsing', filePath: '/videos/browsing.mp4', category: 'General', language: 'ur' },
    ]);
    console.log(`Seeded ${videos.length} videos`);

    const quizzes = await Quiz.insertMany([
      { title: 'Phishing Quiz', category: 'Phishing', difficulty: 'easy', totalQuestions: 5, targetRoles: ['employee'] },
    ]);
    console.log(`Seeded ${quizzes.length} quizzes`);

    const games = await Game.insertMany([
      { name: 'Phishing Spotter', category: 'Phishing', maxScore: 1000, gameUrl: '/games/spotter' },
    ]);
    console.log(`Seeded ${games.length} games`);

    const attacks = await Attack.insertMany([
      { name: 'Email Spoofing', severity: 'high' },
      { name: 'Spear Phishing', severity: 'critical' },
      { name: 'Macro Malware', severity: 'high' },
    ]);
    console.log(`Seeded ${attacks.length} attacks`);

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
