'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Trophy, CheckCircle } from 'lucide-react';

// Static game catalogue — matches games/page.tsx, points at the real
// converted files already sitting in frontend/public/games/
const GAME_CATALOGUE = [
  { _id: '0', name: 'Phishing Awareness Game', difficulty: 'easy',   category: 'Phishing',           gameUrl: '/games/phishing-hub/easy_game.html',                         maxScore: 100, icon: '🎯' },
  { _id: '1', name: 'Phishing Awareness Game', difficulty: 'medium', category: 'Phishing',           gameUrl: '/games/phishing-hub/medium_game.html',                       maxScore: 100, icon: '🎯' },
  { _id: '2', name: 'Phishing Awareness Game', difficulty: 'hard',   category: 'Phishing',           gameUrl: '/games/phishing-hub/hard_game.html',                         maxScore: 100, icon: '🎯' },
  { _id: '3', name: 'Hangman',                 difficulty: 'easy',   category: 'Vocabulary',         gameUrl: '/games/hangman/index.html',                                  maxScore: 100, icon: '🔤' },
  { _id: '4', name: 'Defeat the Hacker',       difficulty: 'medium', category: 'Defense',            gameUrl: '/games/phishing-hub/defeat_Hacker.html',                     maxScore: 100, icon: '🛡️' },
  { _id: '5', name: 'Identity Theft Game',     difficulty: 'medium', category: 'Social Engineering', gameUrl: '/games/phishing-hub/IdentityTheftGame/startGame.html',      maxScore: 100, icon: '🕵️' },
  { _id: '6', name: 'Wack the Hacker',         difficulty: 'easy',   category: 'Awareness',          gameUrl: '/games/wack-the-hacker/index.html',                          maxScore: 100, icon: '🔨' },
];

const DIFF_COLORS: Record<string, string> = {
  easy:   'text-green-400',
  medium: 'text-yellow-400',
  hard:   'text-red-400',
};

export default function GamePlayPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [scoreSaved, setScoreSaved] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const game = GAME_CATALOGUE.find(g => g._id === id);

  // The converted static games postMessage a GAME_OVER event when a
  // round finishes. We just display it here — no DB save (static mode).
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (scoreSaved) return;
      if (event.data?.type === 'GAME_OVER') {
        const s = Number(event.data.score ?? 0);
        setFinalScore(s);
        setScoreSaved(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [scoreSaved]);

  if (!game) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-slate-400">Game not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Training
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {game.icon} {game.name}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className={`capitalize font-medium ${DIFF_COLORS[game.difficulty]}`}>
              {game.difficulty}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{game.category}</span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1 text-yellow-400">
              <Trophy className="w-3.5 h-3.5" /> Max {game.maxScore} pts
            </span>
          </div>
        </div>
        {finalScore !== null && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30"
          >
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-yellow-400">Score: {finalScore}</span>
          </motion.div>
        )}
      </div>

      <Card className="p-1 surface-1 rounded-xl border border-purple-500/20 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={game.gameUrl}
          title={game.name}
          className="w-full rounded-lg border-0"
          style={{ height: '600px' }}
          allow="autoplay; fullscreen"
        />
      </Card>

      {scoreSaved && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-green-400 font-medium">Score {finalScore} — nice work!</p>
        </motion.div>
      )}

      <Card className="p-4 surface-1 rounded-xl border border-slate-700">
        <h3 className="text-sm font-semibold text-foreground mb-2">💡 Cyber Safety Tips</h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Don't click on suspicious links or attachments</li>
          <li>• Never share your password or OTP with anyone</li>
          <li>• Think before you click — awareness is your best defense</li>
        </ul>
      </Card>
    </div>
  );
}