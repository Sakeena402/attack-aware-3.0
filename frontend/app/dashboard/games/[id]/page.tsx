'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { gameApi, Game } from '@/app/services/gameApi';
import { useAuth } from '@/app/context/authContext';
import { ArrowLeft, Trophy, CheckCircle } from 'lucide-react';

const DIFF_COLORS: Record<string, string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
};

const GAME_ICONS: Record<string, string> = {
  'Phishing Awareness Game': '🎯',
  'Hangman': '🔤',
  'Defeat the Hacker': '🛡️',
  'Identity Theft Game': '🕵️',
  'Wack the Hacker': '🔨',
};

function getRemark(percentage: number): { text: string; emoji: string } {
  if (percentage >= 90) return { text: "Outstanding! You're a cybersecurity pro.", emoji: '🏆' };
  if (percentage >= 70) return { text: 'Great job! You have solid awareness.', emoji: '👏' };
  if (percentage >= 50) return { text: 'Good effort! A bit more practice will help.', emoji: '💪' };
  return { text: 'Keep practicing — review the tips below and try again.', emoji: '📚' };
}

export default function GamePlayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { state } = useAuth();

  const [scoreSaved, setScoreSaved] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const { data: game, isLoading } = useSWR<Game>(
    `game:${id}`,
    () => gameApi.getById(id),
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (scoreSaved) return;
      if (event.data?.type === 'GAME_OVER' || event.data?.type === 'GAME_SCORE') {
        const s = Number(event.data.score ?? 0);
        setFinalScore(s);
        setSaving(true);
        setSaveError(false);
        try {
          await gameApi.saveScore(id, s);
          setScoreSaved(true);
        } catch {
          setSaveError(true);
        } finally {
          setSaving(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, scoreSaved]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-slate-700 rounded animate-pulse" />
        <div className="h-[600px] bg-slate-700 rounded-xl animate-pulse" />
      </div>
    );
  }

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

  const icon = GAME_ICONS[game.name] ?? '🎮';
  const userName = state.user?.name ?? 'Player';
  const percentage = finalScore !== null ? Math.min(100, Math.round((finalScore / (game.maxScore || 1)) * 100)) : 0;
  const remark = getRemark(percentage);

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
            {icon} {game.name}
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
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
        />
      </Card>

      {finalScore !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 p-4 rounded-xl border ${scoreSaved
              ? 'bg-green-500/10 border-green-500/20'
              : saveError
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-slate-700/30 border-slate-700'
            }`}
        >
          {scoreSaved ? (
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          ) : (
            <Trophy className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`font-bold ${scoreSaved ? 'text-green-400' : 'text-foreground'}`}>
              {userName}, you scored {finalScore} / {game.maxScore} ({percentage}%)!
            </p>
            <p className="text-sm text-slate-300 mt-0.5">
              {remark.emoji} {remark.text}
            </p>
            {saveError && (
              <p className="text-xs text-red-400 mt-1">
                Couldn't save your score — check your connection and try again.
              </p>
            )}
          </div>
        </motion.div>
      )}
      {saving && <p className="text-xs text-slate-400 text-center">Saving your score...</p>}

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