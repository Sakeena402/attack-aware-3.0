'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { getVideos, StaticVideo } from '@/app/data/videos.data';
import { quizApi, QuizCategory } from '@/app/services/quizApi';
import { gameApi, Game } from '@/app/services/gameApi';
import {
  Play, HelpCircle, Gamepad2, Lock, CheckCircle,
  Clock, Trophy, Globe, Shield, Bug, UserX,
} from 'lucide-react';

type Tab = 'videos' | 'quizzes' | 'games';

const TABS: { key: Tab; label: string; icon: any; desc: string }[] = [
  { key: 'videos', label: 'Videos', icon: Play, desc: 'Watch security awareness videos' },
  { key: 'quizzes', label: 'Quizzes', icon: HelpCircle, desc: 'Test your knowledge' },
  { key: 'games', label: 'Games', icon: Gamepad2, desc: 'Learn through interactive games' },
];

const DIFF_COLORS: Record<string, string> = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const DIFF_CONFIG: Record<string, { icon: any; color: string }> = {
  easy: { icon: Shield, color: 'from-green-500/20 to-transparent border-green-500/20' },
  medium: { icon: Bug, color: 'from-yellow-500/20 to-transparent border-yellow-500/20' },
  hard: { icon: UserX, color: 'from-red-500/20 to-transparent border-red-500/20' },
};

const GAME_ICONS: Record<string, string> = {
  'Phishing Awareness Game': '🎯',
  'Hangman': '🔤',
  'Defeat the Hacker': '🛡️',
  'Identity Theft Game': '🕵️',
  'Wack the Hacker': '🔨',
};

export default function TrainingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('videos');
  const [lang, setLang] = useState<'en' | 'ur'>('en');
  const [category, setCategory] = useState('');
  const isUrdu = lang === 'ur';

  // ── Videos — static data, no API call needed ──────────────────────────
  const videos: StaticVideo[] = getVideos(lang, category || undefined);
  const vLoading = false;

  // ── Quizzes — from API/DB ──────────────────────────────────────────────
  const { data: quizzes = [], isLoading: qLoading } = useSWR<QuizCategory[]>(
    'training-quizzes',
    () => quizApi.getCategories(),
    { revalidateOnFocus: false }
  );

  // ── Games — from API/DB ─────────────────────────────────────────────────
  const { data: games = [], isLoading: gLoading } = useSWR<Game[]>(
    'training-games',
    () => gameApi.getAll(),
    { revalidateOnFocus: false }
  );

  const isLoading = tab === 'videos' ? vLoading : tab === 'quizzes' ? qLoading : gLoading;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isUrdu ? 'تربیتی مرکز' : 'Training Hub'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isUrdu
                ? 'ویڈیوز، کوئزز اور گیمز کے ذریعے سائبر سیکیورٹی سیکھیں'
                : 'Build your cybersecurity awareness through videos, quizzes, and games'}
            </p>
          </div>

          {/* Language toggle */}
          <button
            onClick={() => setLang(isUrdu ? 'en' : 'ur')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-purple-500/20 text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            <Globe className="w-4 h-4" />
            {isUrdu ? 'Switch to English' : 'اردو میں دیکھیں'}
          </button>
        </div>
      </motion.div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 border border-purple-500/10 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >

          {/* ════ VIDEOS ════ */}
          {tab === 'videos' && (
            isLoading ? <GridSkeleton cols={3} /> :
              videos.length === 0 ? (
                <EmptyState icon={Play} text="No videos available yet" sub="Videos will appear here once they are added" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {videos.map((video, i) => (
                    <motion.div
                      key={video._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card
                        className={`rounded-xl border overflow-hidden transition-all duration-300 ${video.isLocked
                          ? 'border-slate-700 opacity-75 cursor-not-allowed'
                          : 'border-purple-500/20 hover:border-purple-500/50 cursor-pointer hover:-translate-y-1'
                          }`}
                        onClick={() => !video.isLocked && router.push(`/dashboard/videos/${video._id}`)}
                      >
                        {/* Thumbnail */}
                        <div className="relative h-40 bg-slate-800">
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-slate-800">
                              <Play className="w-10 h-10 text-purple-400" />
                            </div>
                          )}
                          {video.isLocked && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
                              <Lock className="w-6 h-6 text-yellow-400" />
                              <button
                                onClick={e => { e.stopPropagation(); router.push('/dashboard/subscribe'); }}
                                className="px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-bold"
                              >
                                👑 Upgrade
                              </button>
                            </div>
                          )}
                          {video.isCompleted && (
                            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-medium">
                              <CheckCircle className="w-3 h-3" /> Completed
                            </div>
                          )}
                          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${video.language === 'ur' ? 'bg-green-500/80 text-white' : 'bg-blue-500/80 text-white'
                            }`}>
                            {video.language === 'ur' ? 'اردو' : 'English'}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <h3
                            className="font-semibold text-foreground text-sm leading-snug"
                            dir={video.language === 'ur' ? 'rtl' : 'ltr'}
                          >
                            {video.title}
                          </h3>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-400">{video.category}</span>
                            {!video.isLocked && !video.isCompleted && (
                              <span className="text-xs text-purple-400">+10 pts</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )
          )}

          {/* ════ QUIZZES ════ */}
          {tab === 'quizzes' && (
            isLoading ? <GridSkeleton cols={4} /> :
              quizzes.length === 0 ? (
                <EmptyState icon={HelpCircle} text="No quizzes available yet" sub="Quizzes will appear here once they are added" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {quizzes.map((quiz, i) => (
                    <motion.div
                      key={quiz._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card
                        className={`p-4 rounded-xl border overflow-hidden transition-all duration-300 relative ${quiz.isLocked
                          ? 'border-slate-700 opacity-70 cursor-not-allowed'
                          : 'border-purple-500/20 hover:border-purple-500/50 cursor-pointer hover:-translate-y-1'
                          }`}
                        onClick={() => !quiz.isLocked && router.push(`/dashboard/quizzes/${quiz._id}`)}
                      >
                        {quiz.isLocked && (
                          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-medium border border-yellow-400/30">
                            👑 {isUrdu ? 'بند' : 'Premium'}
                          </div>
                        )}

                        {quiz.thumbnail ? (
                          <div className="h-28 -mx-4 -mt-4 mb-3 overflow-hidden rounded-t-xl">
                            <img src={quiz.thumbnail} alt={quiz.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-16 flex items-center justify-center mb-3 rounded-lg bg-gradient-to-br from-purple-900/40 to-slate-800">
                            <HelpCircle className="w-7 h-7 text-purple-400" />
                          </div>
                        )}

                        <h3
                          className="font-semibold text-foreground text-sm leading-snug mb-1"
                          dir={isUrdu ? 'rtl' : 'ltr'}
                        >
                          {isUrdu ? quiz.title_ur : quiz.title}
                        </h3>
                        <p
                          className="text-xs text-slate-400 line-clamp-2 mb-3"
                          dir={isUrdu ? 'rtl' : 'ltr'}
                        >
                          {isUrdu ? quiz.description_ur : quiz.description}
                        </p>

                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${DIFF_COLORS[quiz.difficulty]}`}>
                            {quiz.difficulty}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {quiz.timeLimit ?? 40}s/q
                          </div>
                        </div>

                        <div className="mt-3">
                          {quiz.isLocked ? (
                            <button
                              onClick={e => { e.stopPropagation(); router.push('/dashboard/subscribe'); }}
                              className="w-full py-1.5 rounded-lg bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-300 transition"
                            >
                              {isUrdu ? 'ان لاک کریں' : 'Upgrade to Unlock'}
                            </button>
                          ) : (
                            <div className="w-full py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 text-xs font-medium text-center border border-purple-500/20">
                              {isUrdu ? 'کوئز شروع کریں ← +20 pts' : 'Start Quiz → +20 pts on pass'}
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )
          )}

          {/* ════ GAMES ════ */}
          {tab === 'games' && (
            isLoading ? <GridSkeleton cols={3} /> :
              games.length === 0 ? (
                <EmptyState icon={Gamepad2} text="No games available yet" sub="Games will appear here once they are added" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {games.map((game, i) => {
                    const diff = DIFF_CONFIG[game.difficulty] ?? DIFF_CONFIG.easy;
                    const icon = GAME_ICONS[game.name] ?? '🎮';
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
                          onClick={() => !game.isLocked && router.push(`/dashboard/games/${game._id}`)}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <span className="text-4xl">{icon}</span>
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
              )
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
function GridSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-5`}>
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <div key={i} className="h-52 bg-slate-700 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, text, sub }: { icon: any; text: string; sub?: string }) {
  return (
    <div className="text-center py-20 text-slate-400">
      <Icon className="w-12 h-12 mx-auto mb-3 text-slate-600" />
      <p className="font-medium">{text}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}