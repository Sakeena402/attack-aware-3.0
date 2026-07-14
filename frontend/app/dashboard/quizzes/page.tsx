'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { quizApi, QuizCategory } from '@/app/services/quizApi';
import { HelpCircle, Lock, Clock, Globe } from 'lucide-react';

const DIFFICULTIES = ['All', 'easy', 'medium', 'hard'];

const DIFF_COLORS: Record<string, string> = {
  easy:   'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard:   'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function QuizzesPage() {
  const router = useRouter();
  const [lang, setLang]             = useState<'en' | 'ur'>('en');
  const [difficulty, setDifficulty] = useState('');

  const { data: quizzes = [], isLoading } = useSWR<QuizCategory[]>(
    'quiz-categories',
    () => quizApi.getCategories(),
    { revalidateOnFocus: false }
  );

  const filtered = difficulty
    ? quizzes.filter(q => q.difficulty === difficulty)
    : quizzes;

  const isUrdu = lang === 'ur';

  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isUrdu ? 'اپنا کوئز منتخب کریں' : 'Security Awareness Quizzes'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isUrdu
                ? '20 زمروں میں اپنی سائبر آگاہی جانچیں'
                : 'Test your knowledge across 20 cybersecurity categories'}
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

      {/* Difficulty filter */}
      <div className="flex gap-2 flex-wrap">
        {DIFFICULTIES.map(d => (
          <button
            key={d}
            onClick={() => setDifficulty(d === 'All' ? '' : d)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              (d === 'All' && !difficulty) || difficulty === d
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground border border-slate-700'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Stats banner */}
      <div className="flex gap-4 text-xs text-slate-400 flex-wrap">
        <span>{quizzes.length} total categories</span>
        <span>•</span>
        <span>{quizzes.filter(q => !q.isLocked).length} unlocked</span>
        <span>•</span>
        <span>40 seconds per question</span>
      </div>

      {/* Quiz grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 bg-slate-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((quiz, i) => (
            <motion.div
              key={quiz._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={`p-4 rounded-xl border overflow-hidden transition-all duration-300 relative ${
                  quiz.isLocked
                    ? 'border-slate-700 opacity-70 cursor-not-allowed'
                    : 'border-purple-500/20 hover:border-purple-500/50 cursor-pointer hover:-translate-y-1'
                }`}
                onClick={() => !quiz.isLocked && router.push(`/dashboard/quizzes/${quiz._id}`)}
              >
                {/* Lock badge */}
                {quiz.isLocked && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-medium border border-yellow-400/30">
                    👑 {isUrdu ? 'بند' : 'Premium'}
                  </div>
                )}

                {/* Thumbnail */}
                {quiz.thumbnail ? (
                  <div className="h-28 -mx-4 -mt-4 mb-3 overflow-hidden">
                    <img src={quiz.thumbnail} className="w-full h-full object-cover" alt="" />
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center mb-3 rounded-lg bg-gradient-to-br from-purple-900/40 to-slate-800">
                    <HelpCircle className="w-8 h-8 text-purple-400" />
                  </div>
                )}

                {/* Title */}
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

                {/* Meta */}
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${DIFF_COLORS[quiz.difficulty]}`}>
                    {quiz.difficulty}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {quiz.timeLimit ?? 40}s/q
                  </div>
                </div>

                {/* Action */}
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
      )}
    </div>
  );
}