'use client';

import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { gameApi, Game } from '@/app/services/gameApi';
import { Gamepad2, Lock, Trophy, Shield, Bug, UserX } from 'lucide-react';

const DIFF_CONFIG: Record<string, { color: string; icon: any; label: string; desc: string }> = {
    easy: { color: 'from-green-500/20 to-transparent border-green-500/20', icon: Shield, label: 'Easy', desc: 'Perfect for beginners. Fun gameplay while learning cyber safety.' },
    medium: { color: 'from-yellow-500/20 to-transparent border-yellow-500/20', icon: Bug, label: 'Medium', desc: 'A balanced challenge. Test your awareness with moderate difficulty.' },
    hard: { color: 'from-red-500/20 to-transparent border-red-500/20', icon: UserX, label: 'Hard', desc: 'For experts. Push your limits with advanced cyber challenges.' },
};

// Games catalogue — maps to DB entries by name
const GAME_CATALOGUE = [
    { name: 'Phishing Awareness Game', difficulty: 'easy', desc: 'Identify phishing emails and links before it\'s too late!', icon: '🎯', category: 'Phishing' },
    { name: 'Phishing Awareness Game', difficulty: 'medium', desc: 'Medium difficulty phishing scenarios. Can you spot them all?', icon: '🎯', category: 'Phishing' },
    { name: 'Phishing Awareness Game', difficulty: 'hard', desc: 'Advanced phishing attacks. Only experts can pass!', icon: '🎯', category: 'Phishing' },
    { name: 'Hangman', difficulty: 'easy', desc: 'Guess cybersecurity terms before the hangman is complete.', icon: '🔤', category: 'Vocabulary' },
    { name: 'Defeat the Hacker', difficulty: 'medium', desc: 'Stop the hacker from breaching your system step by step.', icon: '🛡️', category: 'Defense' },
    { name: 'Identity Theft Game', difficulty: 'medium', desc: 'Protect your identity from thieves in this interactive story.', icon: '🕵️', category: 'Social Engineering' },
    { name: 'Wack the Hacker', difficulty: 'easy', desc: 'Whack the hackers before they steal your data!', icon: '🔨', category: 'Awareness' },
];

export default function GamesPage() {
    const router = useRouter();

    const { data: games = [], isLoading } = useSWR<Game[]>(
        'games',
        () => gameApi.getAll(),
        { revalidateOnFocus: false }
    );

    // ✅ Fix — cast properly, Game interface doesn't have 'desc' or 'icon'
    const displayGames: Game[] = games.length > 0
        ? games
        : GAME_CATALOGUE.map((g, i) => ({
            _id: String(i),
            name: g.name,
            description: g.desc,          // ✅ desc → description
            category: g.category,
            difficulty: g.difficulty as 'easy' | 'medium' | 'hard',
            maxScore: 100,
            gameUrl: '',
            targetRoles: ['all'],
            isLocked: false,
            thumbnail: undefined,
        } as Game));

    return (
        <div className="space-y-6">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-foreground">Security Games</h1>
                <p className="text-muted-foreground mt-1">
                    Learn cybersecurity through interactive games
                </p>
            </motion.div>

            {/* Difficulty legend */}
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

            {/* Games grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-52 bg-slate-700 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {displayGames.map((game: any, i) => {
                        const diff = DIFF_CONFIG[game.difficulty] ?? DIFF_CONFIG.easy;
                        const DiffIcon = diff.icon;
                        return (
                            <motion.div
                                key={game._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                            >
                                <Card
                                    className={`p-5 rounded-xl border bg-gradient-to-br transition-all duration-300 ${game.isLocked
                                        ? 'border-slate-700 opacity-70 cursor-not-allowed'
                                        : `${diff.color} hover:-translate-y-1 cursor-pointer hover:shadow-lg`
                                        }`}
                                    onClick={() => !game.isLocked && router.push(`/dashboard/games/${game._id}`)}                                >
                                    {/* Game icon + difficulty */}
                                    <div className="flex items-start justify-between mb-4">
                                        <span className="text-4xl">{game.icon ?? '🎮'}</span>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${game.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                                game.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {game.difficulty}
                                            </span>
                                            {game.isLocked && (
                                                <span className="text-yellow-400 text-xs flex items-center gap-1">
                                                    <Lock className="w-3 h-3" /> Premium
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Name + desc */}
                                    <h3 className="font-bold text-foreground mb-1">{game.name}</h3>
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{game.description ?? game.desc}</p>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                                            <Trophy className="w-3 h-3" />
                                            Max: {game.maxScore} pts
                                        </div>
                                        <span className="text-xs text-slate-400">{game.category}</span>
                                    </div>

                                    {/* Action */}
                                    <div className="mt-3">
                                        {game.isLocked ? (
                                            <button
                                                onClick={e => { e.stopPropagation(); router.push('/dashboard/subscribe'); }}
                                                className="w-full py-1.5 rounded-lg bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-300 transition"
                                            >
                                                👑 Upgrade to Play
                                            </button>
                                        ) : (
                                            <div className="w-full py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium text-center border border-white/10">
                                                ▶ Play Now
                                            </div>
                                        )}
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