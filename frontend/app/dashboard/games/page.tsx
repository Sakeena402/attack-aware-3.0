'use client';

import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { gameApi, Game } from '@/app/services/gameApi';
import { Gamepad2, Trophy, Shield, Bug, UserX } from 'lucide-react';

const DIFF_CONFIG: Record<string, { color: string; icon: any; label: string; desc: string }> = {
  easy:   { color: 'from-green-500/20 to-transparent border-green-500/20', icon: Shield, label: 'Easy', desc: 'Perfect for beginners. Fun gameplay while learning cyber safety.' },
  medium: { color: 'from-yellow-500/20 to-transparent border-yellow-500/20', icon: Bug, label: 'Medium', desc: 'A balanced challenge. Test your awareness with moderate difficulty.' },
  hard:   { color: 'from-red-500/20 to-transparent border-red-500/20', icon: UserX, label: 'Hard', desc: 'For experts. Push your limits with advanced cyber challenges.' },
};

const GAME_ICONS: Record<string, string> = {
  'Phishing Awareness Game': '🎯',
  'Hangman':                 '🔤',
  'Defeat the Hacker':       '🛡️',
  'Identity Theft Game':     '🕵️',
  'Wack the Hacker':         '🔨',
};

export default function GamesPage() {
  const router = useRouter();

  const { data: games = [], isLoading } = useSWR<Game[]>(
    'games',
    () => gameApi.getAll(),
    { revalidateOnFocus: false }
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Security Games</h1>
        <p className="text-muted-foreground mt-1">Learn cybersecurity through interactive games</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(DIFF_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Card key={key} className={`p-4 rounded-xl border bg-gradient-to-br ${cfg.color}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground capitalize">{cfg.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{cfg.desc}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 bg-slate-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="font-medium">No games available yet</p>
          <p className="text-xs text-slate-500 mt-1">Games will appear here once they are added</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game, i) => {
            const diff = DIFF_CONFIG[game.difficulty] ?? DIFF_CONFIG.easy;
            const icon = GAME_ICONS[game.name] ?? '🎮';
            return (
              <motion.div key={game._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card
                  className={`p-5 rounded-xl border bg-gradient-to-br transition-all duration-300 ${diff.color} hover:-translate-y-1 cursor-pointer hover:shadow-lg`}
                  onClick={() => router.push(`/dashboard/games/${game._id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl">{icon}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      game.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                      game.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {game.difficulty}
                    </span>
                  </div>

                  <h3 className="font-bold text-foreground mb-1">{game.name}</h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{game.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                      <Trophy className="w-3 h-3" />
                      Max: {game.maxScore} pts
                    </div>
                    <span className="text-xs text-slate-400">{game.category}</span>
                  </div>

                  <div className="mt-3">
                    <div className="w-full py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium text-center border border-white/10">
                      ▶ Play Now
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}