// ✅ Replace with:
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { Game } from '../src/models/Game.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attackaware';

const games = [
  {
    name: 'Phishing Awareness Game',
    description: "Identify phishing emails and links before it's too late!",
    category: 'Phishing',
    difficulty: 'easy',
    maxScore: 100,
    gameUrl: '/games/phishing-hub/easy_game.html',
    targetRoles: ['all'],
  },
  {
    name: 'Phishing Awareness Game',
    description: 'Medium difficulty phishing scenarios. Can you spot them all?',
    category: 'Phishing',
    difficulty: 'medium',
    maxScore: 100,
    gameUrl: '/games/phishing-hub/medium_game.html',
    targetRoles: ['all'],
  },
  {
    name: 'Phishing Awareness Game',
    description: 'Advanced phishing attacks. Only experts can pass!',
    category: 'Phishing',
    difficulty: 'hard',
    maxScore: 100,
    gameUrl: '/games/phishing-hub/hard_game.html',
    targetRoles: ['all'],
  },
  {
    name: 'Hangman',
    description: 'Guess cybersecurity terms before the hangman is complete.',
    category: 'Vocabulary',
    difficulty: 'easy',
    maxScore: 100,
    gameUrl: '/games/hangman/index.html',
    targetRoles: ['all'],
  },
  {
    name: 'Defeat the Hacker',
    description: 'Stop the hacker from breaching your system step by step.',
    category: 'Defense',
    difficulty: 'medium',
    maxScore: 100,
    gameUrl: '/games/phishing-hub/defeat_Hacker.html',
    targetRoles: ['all'],
  },
  {
    name: 'Identity Theft Game',
    description: 'Protect your identity from thieves in this interactive story.',
    category: 'Social Engineering',
    difficulty: 'medium',
    maxScore: 100,
    gameUrl: '/games/phishing-hub/IdentityTheftGame/startGame.html',
    targetRoles: ['all'],
  },
  {
    name: 'Wack the Hacker',
    description: 'Whack the hackers before they steal your data!',
    category: 'Awareness',
    difficulty: 'easy',
    maxScore: 100,
    gameUrl: '/games/wack-the-hacker/index.html',
    targetRoles: ['all'],
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI, { dbName: 'attackaware3' });
  console.log('Connected to Mongo, seeding games...');

  for (const g of games) {
    const existing = await Game.findOne({ name: g.name, difficulty: g.difficulty });
    if (existing) {
      await Game.updateOne({ _id: existing._id }, g);
      console.log(`Updated: ${g.name} (${g.difficulty})`);
    } else {
      await Game.create(g);
      console.log(`Created: ${g.name} (${g.difficulty})`);
    }
  }

  console.log('Done.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});